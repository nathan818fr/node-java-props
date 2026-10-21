# java-props

[![npm version](https://img.shields.io/npm/v/java-props.svg)](https://www.npmjs.com/package/java-props)
[![CI](https://github.com/nathan818fr/node-java-props/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nathan818fr/node-java-props/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/java-props.svg)](LICENSE)

Read and write Java `.properties` files in JavaScript (Node.js and browsers). The parser implements the syntax of
Java's [`Properties.load()`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Properties.html#load(java.io.Reader)).

- Full syntax: `=`, `:` or whitespace separators, `#` and `!` comments, continuation lines, escapes and `\uXXXX`,
  LF, CRLF and CR line endings
- [Edge cases](test/cases/parse-cases.mts) checked against real JVMs, from Java 8 to 25
- Any key is safe, including `__proto__`; malformed `\uXXXX` escapes throw, like in Java
- No dependencies, TypeScript declarations included
- Node.js >= 6, browsers (ES2015), CommonJS and ESM, TypeScript >= 2.9

## Installation

```bash
npm install java-props
```

## Usage

```javascript
import {parse, parseFile, stringify} from 'java-props';
// or: const {parse, parseFile, stringify} = require('java-props');
```

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
const props = await parseFile('config.properties');
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
parse('a = 1\nb : 2');
// { a: '1', b: '2' }
```

### Stringify

```javascript
stringify({'key with spaces': 'Café ☕', 'line.break': 'a\nb'});
```

```properties
key\ with\ spaces: Caf\u00E9 \u2615
line.break: a\nb
```

## API

### `parse(str)`

Parses a .properties string and returns its properties, as an object with a `null` prototype (any key is safe,
including `__proto__`). Throws an `Error` on malformed `\uXXXX` escapes (where Java throws an
`IllegalArgumentException`).

### `parseFile(path, encoding?)`

_Node.js only._ Reads and parses a .properties file, and returns a `Promise` of its properties. `path` is a file path
(`string`, `Buffer` or `URL`) or a file descriptor. `encoding` defaults to `'utf8'`; use `'latin1'` for files written by
Java's `Properties.store(OutputStream)`.

### `stringify(props)`

Converts an object of string values (own enumerable properties only) to a .properties string, which Java reads back as
the same keys and values.

<details>
<summary><b>Low-level functions</b> (<code>java-props/dist/utils</code>)</summary>

The building blocks of `parse` and `stringify`, for finer parsing (e.g. to keep the line order or the raw key/value
text):

- `rawParse(str, consumeFn)`: calls `consumeFn({line, sepStart, valueStart})` for each logical line
  (the key is `line.substring(0, sepStart)` and the value `line.substring(valueStart)`, both still escaped).
- `rawParseLine(line)`: the key/value boundaries of one logical line.
- `new LineReader(str).readLine()`: the next logical line, or `undefined` at the end.
- `decodeLine(str)` / `encodeLine(str, isKey?)`: decodes / escapes a key or a value.

</details>

The default export (`javaProps.default`) and `convertLine` (alias of `decodeLine`) are deprecated.

## Contributing

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
