import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.io.StringReader;
import java.util.Map;
import java.util.Properties;
import java.util.TreeMap;

/**
 * Runs java.util.Properties for reference.mts. Java 8 compatible (compiled with --release 8, run on every tested JDK).
 *
 * Protocol: one request per line on stdin, one response per line on stdout. Strings are sent as hex UTF-16 code
 * units (4 digits per char), so that any char gets through (line terminators, lone surrogates...):
 * - "version" -> "<java.version>"
 * - "load <hex input>" -> "ok <hex key>:<hex value>,..." (sorted by key), or "throw <exception class> <hex message>"
 */
public class JavaReference {
    public static void main(String[] args) throws Exception {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in, "UTF-8"));
        PrintStream out = new PrintStream(System.out, false, "UTF-8");
        String request;
        while ((request = in.readLine()) != null) {
            int space = request.indexOf(' ');
            String command = space < 0 ? request : request.substring(0, space);
            String payload = space < 0 ? "" : request.substring(space + 1);
            if (command.equals("version")) {
                out.println(System.getProperty("java.version"));
            } else if (command.equals("load")) {
                out.println(load(decode(payload)));
            } else {
                throw new IllegalArgumentException("Unknown command: " + command);
            }
            out.flush();
        }
    }

    private static String load(String input) {
        Properties props = new Properties();
        try {
            props.load(new StringReader(input));
        } catch (Throwable t) {
            String message = t.getMessage();
            return "throw " + t.getClass().getName() + " " + encode(message == null ? "" : message);
        }
        TreeMap<String, String> sorted = new TreeMap<String, String>();
        for (String key : props.stringPropertyNames()) {
            sorted.put(key, props.getProperty(key));
        }
        StringBuilder sb = new StringBuilder("ok ");
        boolean first = true;
        for (Map.Entry<String, String> entry : sorted.entrySet()) {
            if (!first) {
                sb.append(',');
            }
            first = false;
            sb.append(encode(entry.getKey())).append(':').append(encode(entry.getValue()));
        }
        return sb.toString();
    }

    private static String encode(String str) {
        StringBuilder sb = new StringBuilder(str.length() * 4);
        for (int i = 0; i < str.length(); i++) {
            String hex = Integer.toHexString(str.charAt(i));
            sb.append("0000", hex.length(), 4).append(hex);
        }
        return sb.toString();
    }

    private static String decode(String hex) {
        StringBuilder sb = new StringBuilder(hex.length() / 4);
        for (int i = 0; i < hex.length(); i += 4) {
            sb.append((char) Integer.parseInt(hex.substring(i, i + 4), 16));
        }
        return sb.toString();
    }
}
