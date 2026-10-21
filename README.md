# java-props

[![npm version](https://img.shields.io/npm/v/java-props.svg)](https://www.npmjs.com/package/java-props)
[![CI](https://github.com/nathan818fr/node-java-props/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nathan818fr/node-java-props/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/java-props.svg)](LICENSE)

Read and write Java `.properties` files in JavaScript (Node.js and browsers), with the syntax of Java's
[`Properties.load()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Properties.html#load(java.io.Reader)),
or exactly the results of a given Java version.

- Full syntax: `=`, `:` or whitespace separators, `#` and `!` comments, continuation lines, escapes and `\uXXXX`,
  LF, CRLF and CR line endings
- With the `javaVersion` option: identical to `Properties.load()` and `store()` of that Java version, checked against
  real JVMs (Java 8 to 25) on [edge cases](test/cases/parse-cases.mts) and random inputs
- Any key is safe, including `__proto__`; malformed `\uXXXX` escapes throw, like in Java
- No dependencies, TypeScript declarations included
- Node.js >= 6, browsers (ES2015), CommonJS and ESM, TypeScript >= 2.9

## Installation

```bash
npm install java-props
```

## Usage

```javascript
import {parse, parseFile, readEntries, stringify} from 'java-props';
// or: const {parse, parseFile, readEntries, stringify} = require('java-props');
```

The examples use `javaVersion: 21`, for exactly the results of Java 21 (see [Java versions](#java-versions)). Without
it, java-props uses its legacy parser.

### Read a file

```properties
# config.properties
app.name = My App
app.title : Caf\u00e9 \u2615
app.greeting   Hello, \
                World!
db.url=jdbc:postgresql://localhost:5432/app
install.dir = C:\\Program Files\\App
key\ with\ spaces = value
! this is a comment too
```

```javascript
const props = await parseFile('config.properties', {javaVersion: 21});
// {
//   'app.name': 'My App',
//   'app.title': 'Café ☕',
//   'app.greeting': 'Hello, World!',
//   'db.url': 'jdbc:postgresql://localhost:5432/app',
//   'install.dir': 'C:\\Program Files\\App',
//   'key with spaces': 'value'
// }
```

### Parse a string

```javascript
parse('a = 1\nb : 2', {javaVersion: 21});
// { a: '1', b: '2' }
```

### Read entries one by one

For the order of the entries, duplicate keys, the raw text, or positions:

```javascript
const reader = readEntries('b = 1\na = 2\nb = 3', {javaVersion: 21, positions: true});
while (reader.next()) {
    console.log(reader.key, reader.value, reader.startLine);
}
// b 1 1
// a 2 2
// b 3 3
```

### Stringify

```javascript
stringify({'key with spaces': 'Café ☕', 'line.break': 'a\nb'}, {javaVersion: 21});
```

```properties
#Thu Jan 15 14:04:05 CET 2026
key\ with\ spaces=Café ☕
line.break=a\nb
```

Like `Properties.store(Writer)`, non-ASCII characters are written as-is (save it as UTF-8). With `escapeUnicode: true`,
they are written as `\uXXXX`, like `store(OutputStream)`.

## API

### `parse(str, options?)`

Parses a .properties string and returns its properties, as an object with a `null` prototype (any key is safe,
including `__proto__`). Throws an `Error` on malformed `\uXXXX` escapes (where Java throws an
`IllegalArgumentException`), and a `TypeError` or a `RangeError` on an invalid `javaVersion`.

| Option        | Default       | Description                                                                                                                                                 |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `javaVersion` | legacy parser | Parse exactly like `Properties.load()` of this [Java version](#java-versions): `21`, `'11.0.4'`, `'1.8.0_392'`, `'latest'`... A number is the cheapest form |

### `parseFile(path, encoding?, options?)`, `parseFile(path, options?)`

_Node.js only._ Reads and parses a .properties file, and returns a `Promise` of its properties. `path` is a file path
(`string`, `Buffer` or `URL`) or a file descriptor.

| Option        | Default  | Description                                                                                                |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `javaVersion` |          | See `parse`                                                                                                |
| `encoding`    | `'utf8'` | File encoding (also the second argument): `'latin1'` for files written by `Properties.store(OutputStream)` |

### `readEntries(str, options?)`

Reads the entries of a .properties string one at a time, in order (duplicate keys included). Nothing is decoded until
it is accessed, so reading only some entries, or only their raw text, is fast.

```javascript
const reader = readEntries(str, {javaVersion: 21, positions: true});
while (reader.next()) {
    reader.key;      // decoded key (throws an Error on malformed escapes, like parse)
    reader.value;    // decoded value
    reader.rawKey;   // key with its escape sequences
    reader.rawValue; // value with its escape sequences
    reader.line;     // logical line (continuation lines joined)
    reader.start;    // with `positions`: offsets of the entry in `str` (start, end),
    reader.end;      //   and line and column of its start (from 1)
    reader.startLine;
    reader.startColumn;
}
```

| Option        | Default | Description                                           |
| ------------- | ------- | ----------------------------------------------------- |
| `javaVersion` |         | See `parse`                                           |
| `positions`   | `false` | Compute `start`, `end`, `startLine` and `startColumn` |

### `stringify(props, options?)`

Converts an object of string values (own enumerable properties only) to a .properties string, which Java reads back as
the same keys and values. With options, throws a `TypeError` if a value is not a string.

| Option                | Default       | With `javaVersion`           | Description                                                                  |
| --------------------- | ------------- | ---------------------------- | ---------------------------------------------------------------------------- |
| `javaVersion`         |               |                              | Write like `Properties.store(Writer)` of this Java version (see `parse`)     |
| `escapeUnicode`       | `true`        | `false`                      | Escape non-ASCII chars as `\uXXXX`, like `store(OutputStream)`               |
| `separator`           | `': '`        | `'='`                        | `'='`, `':'`, `' '`, `': '` or `' = '`                                       |
| `comments`            |               |                              | Comments written first, like the `comments` argument of `store()`            |
| `date`                | `false`       | `true`                       | Date comment: `true` (now), a `Date`, or a string (written as a comment)     |
| `timeZone`            | system        | system                       | Time zone of the date (IANA name, `'UTC'` or a fixed offset like `'+02:00'`) |
| `order`               | `'insertion'` | `'sorted'`                   | `'insertion'` (JavaScript order: integer-like keys first) or `'sorted'`      |
| `lineSeparator`       | `'\n'`        | system (`'\r\n'` on Windows) | `'\n'`, `'\r\n'` or `'\r'`                                                   |
| `escapeValueSpecials` | `false`       | `true`                       | Also escape `=`, `:`, `#` and `!` in values                                  |

Dates are written like Java's `Date.toString()`. Time zone names come from `Intl`, which doesn't always use Java's
names: the output is exact for `'UTC'` and fixed offsets, and a `date` string makes it reproducible.

### `escapeKey(key, options?)`, `escapeValue(value, options?)`

Escape a key or a value, like `stringify`.

| Option                | Default | With `javaVersion` | Description                                                                |
| --------------------- | ------- | ------------------ | -------------------------------------------------------------------------- |
| `javaVersion`         |         |                    | Escape like `Properties.store(Writer)` of this Java version (see `parse`)  |
| `escapeUnicode`       | `true`  | `false`            | Escape non-ASCII chars as `\uXXXX`, like `store(OutputStream)`             |
| `escapeValueSpecials` | `false` | `true`             | `escapeValue`: also escape `=`, `:`, `#` and `!` (`escapeKey` always does) |

<details>
<summary><b>Deprecated APIs</b></summary>

The default export, and the functions of `java-props/dist/utils` (which keep the original behavior, without
`javaVersion`), are deprecated. Their replacements:

| Deprecated                                             | Replacement                                                |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| Default export (`javaProps.default`)                   | Named exports (`parse`, `parseFile`, `stringify`)          |
| `rawParse(str, ({line, sepStart, valueStart}) => ...)` | `readEntries(str)`: `reader.line`, `rawKey` and `rawValue` |
| `new LineReader(str).readLine()`                       | `readEntries(str)`: `reader.next()` and `reader.line`      |
| `rawParseLine(line)`                                   | `reader.rawKey`, `reader.rawValue`                         |
| `decodeLine(str)`, `convertLine(str)`                  | `reader.key`, `reader.value`                               |
| `encodeLine(str)`, `encodeLine(str, true)`             | `escapeValue(str)`, `escapeKey(str)`                       |

</details>

## Java versions

`Properties.load()` changed in a few Java versions, on unusual inputs only: some combinations of backslashes and
comments, and truncated `\uXXXX` escapes. The `javaVersion` option picks the behavior:

| `javaVersion`                             | Behavior                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| not set                                   | Legacy: the original java-props parser, close to Java 8                                                             |
| `6` to `8`                                | Java 6 to 8                                                                                                         |
| `9`, `10`, `12`, `'11.0.0'` to `'11.0.4'` | Changed in Java 9: comments are skipped faster, which changed what some malformed lines read                        |
| `11` (`'11.0.5'` and later)               | Changed in Java 11.0.5, not in 12: [a rewritten line reader](https://bugs.openjdk.org/browse/JDK-8224202)           |
| `13` and later, `'latest'`                | Changed in Java 13: [a truncated `\uXXXX` at the end of a line throws](https://bugs.openjdk.org/browse/JDK-8224240) |

A major version alone means its latest update. For `stringify`, `javaVersion` only sets the defaults of the options,
the same for every version.

## Contributing

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
