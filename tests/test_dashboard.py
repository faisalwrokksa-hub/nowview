import unittest
from dashboard import normalise, ChartCache


def sample():
    return ([[100000, '10', '12', '9', '11', '100', 159999]],
            {'symbol': 'SOXLBUSDT', 'priceChangePercent': '2.5', 'closeTime': 1000000},
            [{'price': '11', 'time': 950000}],
            {'symbol': 'SOXLBUSDT', 'baseAsset': 'SOXLB', 'quoteAsset': 'USDT', 'status': 'TRADING'})


class DashboardTests(unittest.TestCase):
    def test_uses_real_trade_time_not_ticker_window_end(self):
        out = normalise(*sample(), 'SOXLB', '1D', now=1000)
        self.assertEqual(out['quoteTime'], 950)
        self.assertEqual(out['currency'], 'USDT')
        self.assertEqual(out['changeBasis'], '24h')

    def test_token_trading_is_not_closed_by_new_york_weekend(self):
        out = normalise(*sample(), 'SOXLB', '1D', now=1000)
        self.assertIn('24/7', out['session'])
        self.assertEqual(out['status'], 'Recent exchange trade')

    def test_inactive_pair_is_not_silently_replaced(self):
        bars, ticker, trades, info = sample()
        info['status'] = 'BREAK'
        with self.assertRaises(ValueError):
            normalise(bars, ticker, trades, info, 'SOXLB', '1D', now=1000)

    def test_underlying_us_stock_cannot_masquerade_as_token(self):
        bars, ticker, trades, info = sample()
        info['baseAsset'] = 'SOXL'
        with self.assertRaises(ValueError):
            normalise(bars, ticker, trades, info, 'SOXLB', '1D', now=1000)

    def test_stale_trade_remains_labelled_stale_on_24h_market(self):
        out = normalise(*sample(), 'SOXLB', '1D', now=2000)
        self.assertEqual(out['status'], 'Historical / stale')
        self.assertEqual(out['price'], 11)

    def test_invalid_future_or_missing_bars_are_not_interpolated(self):
        bars, ticker, trades, info = sample()
        bars.extend([[200000, None, '12', '9', '11', '0', 259999],
                     [300000, '10', '5', '9', '11', '0', 359999],
                     [9999999, '10', '12', '9', '11', '0', 10000099]])
        out = normalise(bars, ticker, trades, info, 'SOXLB', '1D', now=1000)
        self.assertEqual(len(out['bars']), 1)

    def test_no_timestamped_trade_cannot_be_called_recent(self):
        bars, ticker, trades, info = sample()
        with self.assertRaises(ValueError):
            normalise(bars, ticker, [], info, 'SOXLB', '1D', now=1000)

    def test_arbitrary_urls_or_symbols_cannot_be_requested(self):
        with self.assertRaises(ValueError):
            ChartCache().get('http://localhost/private', '1D')
        with self.assertRaises(ValueError):
            ChartCache().get('SOXLB', '../../private')


if __name__ == '__main__':
    unittest.main()
