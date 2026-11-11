package app.newview.dashboard;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;
public final class MarketData {
    public static final MarketData INSTANCE = new MarketData();
    private final Map<String, JSONObject> cache = new HashMap<>();
    private volatile long blockedUntil = 0;
    static final String[] SYMBOLS = {"SOXLB","SOXSB","NVDAB","AMDB","AVGOB","TSMB","MUB","ASMLB","SMHB","INTCB","AMATB","ARMB","MRVLB","SMCIB","BMNRB","TQQQB","SQQQB","BTC","ETH"};
    static final String[] RANGES = {"1D","5D","1M","3M","1Y"};
    static final String[] INTERVALS = {"5m","30m","4h","1d","1d"};
    static final long[] WINDOWS = {86400,432000,2592000,7776000,31536000};
    private Object read(String path, String query) throws Exception {
        if (System.currentTimeMillis() / 1000 < blockedUntil) throw new java.io.IOException("API cooldown");
        HttpURLConnection connection = (HttpURLConnection) new URL("https://data-api.binance.vision/api/v3/" + path + "?" + query).openConnection();
        connection.setConnectTimeout(10000);connection.setReadTimeout(10000);
        connection.setRequestProperty("User-Agent", "NewViewMarkets/1.0");connection.setRequestProperty("Accept", "application/json");
        try {
            int status = connection.getResponseCode();
            if (status == 418 || status == 429) {
                long wait = 60;
                try {wait = Math.max(60, Math.min(86400, Long.parseLong(connection.getHeaderField("Retry-After"))));}catch (Exception ignored) { }
                blockedUntil = System.currentTimeMillis() / 1000 + wait;
            }
            if (status != 200) throw new java.io.IOException("Source refused request");
            try (InputStream in = connection.getInputStream();ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192];int count;
                while ((count = in.read(buffer)) != -1) {
                    if (out.size() + count > 4 * 1024 * 1024) throw new java.io.IOException("Response too large");
                    out.write(buffer, 0, count);
                }
                return new JSONTokener(out.toString("UTF-8")).nextValue();
            }
        } finally {connection.disconnect();}
    }

    public synchronized JSONObject fetch(String symbol, String period) throws Exception {
        String key = symbol + ":" + period;
        long now = System.currentTimeMillis() / 1000;
        synchronized (cache) {JSONObject previous = cache.get(key);if (previous != null && now - previous.getLong("fetchedAt") < 30) return previous;}
        int index = Arrays.asList(RANGES).indexOf(period);
        String pair = symbol + "USDT", query = "symbol=" + URLEncoder.encode(pair, "UTF-8");
        JSONObject info = ((JSONObject) read("exchangeInfo", query)).getJSONArray("symbols").getJSONObject(0);
        if (!pair.equals(info.getString("symbol")) || !symbol.equals(info.getString("baseAsset")) || !"USDT".equals(info.getString("quoteAsset")) || !"TRADING".equals(info.getString("status"))) throw new java.io.IOException("Pair unavailable or identity mismatch");
        JSONArray klines = (JSONArray) read("klines", query + "&interval=" + INTERVALS[index] + "&limit=1000&startTime=" + ((now - WINDOWS[index]) * 1000));
        JSONObject ticker = (JSONObject) read("ticker/24hr", query);
        JSONArray trades = (JSONArray) read("trades", query + "&limit=1");
        JSONObject answer = normalise(klines, ticker, trades, symbol, period, System.currentTimeMillis() / 1000);
        synchronized (cache) {cache.put(key, answer);}return answer;
    }

    private static boolean positive(double v) {return !Double.isNaN(v) && !Double.isInfinite(v) && v > 0;}
    static JSONObject normalise(JSONArray klines, JSONObject ticker, JSONArray trades, String symbol, String period, long now) throws Exception {
        if (!(symbol + "USDT").equals(ticker.getString("symbol"))) throw new java.io.IOException("Ticker mismatch");
        TreeMap<Long, JSONArray> sorted = new TreeMap<>();
        for (int i = 0; i < klines.length(); i++) {
            JSONArray row = klines.optJSONArray(i);if (row == null || row.length() < 7) continue;
            long stamp = row.optLong(0) / 1000;
            double o = row.optDouble(1, Double.NaN),h = row.optDouble(2, Double.NaN),l = row.optDouble(3, Double.NaN),c = row.optDouble(4, Double.NaN),v = row.optDouble(5, Double.NaN);
            if (stamp <= 0 || stamp > now + 180 || !positive(o) || !positive(h) || !positive(l) || !positive(c) || h < Math.max(o, Math.max(c,l)) || l > Math.min(o, Math.min(c,h))) continue;
            JSONArray bar = new JSONArray();bar.put(stamp);bar.put(o);bar.put(h);bar.put(l);bar.put(c);bar.put(!Double.isNaN(v) && !Double.isInfinite(v) && v >= 0 ? v : JSONObject.NULL);sorted.put(stamp,bar);
        }
        if (sorted.isEmpty()) throw new java.io.IOException("No valid bars");
        long stamp = 0;double price = Double.NaN;
        for (int i = 0; i < trades.length(); i++) {
            JSONObject trade = trades.getJSONObject(i);long t = trade.optLong("time") / 1000;double p = trade.optDouble("price",Double.NaN);
            if (t > stamp && t <= now + 180 && positive(p)) {stamp=t;price=p;}
        }
        if (stamp <= 0 || !positive(price)) throw new java.io.IOException("No timestamped trade");
        JSONArray bars = new JSONArray();for (JSONArray bar:sorted.values()) bars.put(bar);
        double change = ticker.optDouble("priceChangePercent",Double.NaN);
        JSONObject out = new JSONObject();out.put("symbol",symbol);out.put("pair",symbol+"USDT");out.put("name","BTC".equals(symbol)?"Bitcoin":"ETH".equals(symbol)?"Ethereum":"Tokenized stock / ETF");out.put("currency","USDT");out.put("period",period);out.put("price",price);out.put("quoteTime",stamp);out.put("fetchedAt",now);out.put("ageSeconds",Math.max(0,now-stamp));out.put("status",now-stamp>120?"Historical / stale":"Recent exchange trade");out.put("session","Binance Spot · TRADING · 24/7 market");out.put("changePercent",!Double.isNaN(change)&&!Double.isInfinite(change)?change:JSONObject.NULL);out.put("changeBasis","24h");out.put("bars",bars);out.put("source","Binance public market-data API");out.put("delay","Last-trade timestamp shown; no account or trading connection");return out;
    }


}
