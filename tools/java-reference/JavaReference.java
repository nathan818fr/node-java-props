import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.Date;
import java.util.Map;
import java.util.Properties;
import java.util.TimeZone;
import java.util.TreeMap;

/**
 * Runs java.util.Properties for reference.mts. Java 8 compatible (compiled with --release 8, run on every tested JDK).
 *
 * Protocol: one request per line on stdin, one response per line on stdout. Strings are sent as hex UTF-16 code
 * units (4 digits per char), so that any char gets through (line terminators, lone surrogates...):
 * - "version" -> "<java.version>"
 * - "load <hex input>" -> "ok <hex key>:<hex value>,..." (sorted by key), or "throw <exception class> <hex message>"
 * - "store <writer|stream> <hex comments, or -> <hex key>:<hex value>,..." -> "ok <hex output>": the output of
 *   store(Writer) or store(OutputStream) (decoded as ISO-8859-1), date line included
 * - "date <epoch millis> <time zone id>" -> "ok <hex Date.toString()>"
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
            } else if (command.equals("store")) {
                out.println(store(payload.split(" ", -1)));
            } else if (command.equals("date")) {
                String[] args2 = payload.split(" ");
                TimeZone.setDefault(TimeZone.getTimeZone(args2[1]));
                out.println("ok " + encode(new Date(Long.parseLong(args2[0])).toString()));
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

    private static String store(String[] args) throws Exception {
        Properties props = new Properties();
        if (!args[2].isEmpty()) {
            for (String entry : args[2].split(",")) {
                String[] kv = entry.split(":", -1);
                props.setProperty(decode(kv[0]), decode(kv[1]));
            }
        }
        String comments = args[1].equals("-") ? null : decode(args[1]);
        if (args[0].equals("writer")) {
            StringWriter writer = new StringWriter();
            props.store(writer, comments);
            return "ok " + encode(writer.toString());
        }
        ByteArrayOutputStream stream = new ByteArrayOutputStream();
        props.store(stream, comments);
        return "ok " + encode(new String(stream.toByteArray(), "ISO-8859-1"));
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
