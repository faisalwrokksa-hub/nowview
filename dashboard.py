"""Read-only Binance tokenized-stock/crypto charts; separate from the Telegram bot."""
import argparse
import json
import math
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

SYMBOLS = ('SOXLB', 'SOXSB', 'NVDAB', 'AMDB', 'AVGOB', 'TSMB', 'MUB', 'ASMLB', 'SMHB',
           'INTCB', 'AMATB', 'ARMB', 'MRVLB', 'SMCIB', 'BMNRB', 'TQQQB', 'SQQQB', 'BTC', 'ETH')
RANGES = {'1D': ('5m', 86400), '5D': ('30m', 432000), '1M': ('4h', 2592000),
          '3M': ('1d', 7776000), '1Y': ('1d', 31536000)}
API = 'https://data-api.binance.vision/api/v3/'
WEB = Path(__file__).parent / 'web'


def number(value):
    if isinstance(value, bool):
        return None
    try:
        value = float(value)
        return value if math.isfinite(value) else None
    except (ValueError, TypeError):
        return None


def positive(value):
    value = number(value)
    return value is not None and value > 0


def normalise(klines, ticker, trades, info, symbol, period, now=None):
    """Use actual Binance trades/klines. Never substitute the underlying US stock."""
    now = time.time() if now is None else now
    pair = symbol + 'USDT'
    if info.get('symbol') != pair or info.get('baseAsset') != symbol or info.get('quoteAsset') != 'USDT':
        raise ValueError('Binance returned a different instrument')
    if info.get('status') != 'TRADING':
        raise ValueError('Binance pair is not trading: ' + str(info.get('status', 'unknown')))
    if ticker.get('symbol') != pair:
        raise ValueError('Binance ticker identity mismatch')
    bars = {}
    for row in klines:
        if not isinstance(row, list) or len(row) < 7:
            continue
        stamp = number(row[0])
        if not positive(stamp) or stamp / 1000 > now + 180:
            continue
        values = [number(v) for v in row[1:6]]
        o, h, low, c, volume = values
        if not all(positive(v) for v in values[:4]) or h < max(o, c, low) or low > min(o, c, h):
            continue
        volume = volume if volume is not None and volume >= 0 else None
        bars[int(stamp / 1000)] = [int(stamp / 1000), o, h, low, c, volume]
    bars = [bars[k] for k in sorted(bars)]
    if not bars:
        raise ValueError('No valid Binance historical bars returned')
    valid_trades = [trade for trade in trades if isinstance(trade, dict) and positive(trade.get('price'))
                    and positive(trade.get('time')) and float(trade['time']) / 1000 <= now + 180]
    if not valid_trades:
        raise ValueError('No timestamped Binance trade returned')
    trade = max(valid_trades, key=lambda value: float(value['time']))
    stamp, price = int(float(trade['time']) / 1000), float(trade['price'])
    age = max(0, now - stamp)
    return dict(symbol=symbol, pair=pair, name='Bitcoin' if symbol == 'BTC' else 'Ethereum' if symbol == 'ETH' else 'Tokenized stock / ETF',
                currency='USDT', period=period, price=price, quoteTime=stamp, fetchedAt=int(now),
                ageSeconds=int(age), status='Historical / stale' if age > 120 else 'Recent exchange trade',
                session='Binance Spot · TRADING · 24/7 market', changePercent=number(ticker.get('priceChangePercent')),
                changeBasis='24h', bars=bars, source='Binance public market-data API',
                delay='Last-trade timestamp shown; no account or trading connection')


class ChartCache:
    def __init__(self):
        self.values = {}
        self.lock = threading.Lock()
        self.blocked_until = 0

    def read(self, path, **params):
        if time.time() < self.blocked_until:
            raise OSError('Market source cooldown')
        req = urllib.request.Request(API + path + '?' + urllib.parse.urlencode(params),
                                     headers={'User-Agent': 'FintechMarketCharts/1.0', 'Accept': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code in (418, 429):
                try:
                    cooldown = max(60, min(86400, int(exc.headers.get('Retry-After', '60'))))
                except ValueError:
                    cooldown = 60
                self.blocked_until = time.time() + cooldown
            raise

    def get(self, symbol, period):
        if symbol not in SYMBOLS or period not in RANGES:
            raise ValueError('Unsupported token or range')
        key = (symbol, period)
        with self.lock:
            cached = self.values.get(key)
            if cached and time.time() - cached['fetchedAt'] < 30:
                return cached
            pair = symbol + 'USDT'
            info = self.read('exchangeInfo', symbol=pair).get('symbols') or []
            if not info:
                raise ValueError('This exact token pair is not listed on Binance Spot')
            if info[0].get('status') != 'TRADING':
                raise ValueError('Binance pair is not trading: ' + str(info[0].get('status')))
            interval, seconds = RANGES[period]
            klines = self.read('klines', symbol=pair, interval=interval, limit=1000,
                               startTime=int((time.time() - seconds) * 1000))
            ticker = self.read('ticker/24hr', symbol=pair)
            trades = self.read('trades', symbol=pair, limit=1)
            answer = normalise(klines, ticker, trades, info[0], symbol, period)
            self.values[key] = answer
            return answer


CACHE = ChartCache()


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path == '/api/chart':
            query = urllib.parse.parse_qs(parsed.query)
            try:
                symbol, period = query.get('symbol', ['SOXLB'])[0], query.get('range', ['1D'])[0]
                answer = CACHE.get(symbol, period)
                self.respond(200, json.dumps(answer).encode(), 'application/json')
            except ValueError as exc:
                self.respond(400, json.dumps({'error': str(exc)}).encode(), 'application/json')
            except (OSError, urllib.error.URLError, json.JSONDecodeError):
                self.respond(502, b'{"error":"Binance market data unavailable or rate-limited. Try again shortly."}', 'application/json')
            return
        files = {'/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css', '/market-data.mjs': 'market-data.mjs', '/live.js': 'live.js', '/indicators.js': 'indicators.js'}
        name = files.get(parsed.path)
        if not name:
            self.respond(404, b'Not found', 'text/plain')
            return
        mime = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css'}[Path(name).suffix]
        self.respond(200, (WEB / name).read_bytes(), mime)

    def respond(self, code, data, mime):
        self.send_response(code)
        self.send_header('Content-Type', mime + '; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https://data-api.binance.vision wss://stream.binance.com:443; img-src 'self' data:")
        self.end_headers()
        self.wfile.write(data)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    print(f'Market Charts: http://{args.host}:{args.port}', flush=True)
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
