# java-props

[![npm version](https://img.shields.io/npm/v/java-props.svg)](https://www.npmjs.com/package/java-props)
![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)
[![Build Status](https://app.travis-ci.com/nathan818fr/node-java-props.svg?branch=master)](https://app.travis-ci.com/nathan818fr/node-java-props)
[![codecov](https://codecov.io/gh/nathan818fr/node-java-props/branch/master/graph/badge.svg)](https://codecov.io/gh/nathan818fr/node-java-props)

Read/Parse Java .properties files (using EXACTLY the same [specification](https://docs.oracle.com/javase/10/docs/api/java/util/Properties.html#load%28java.io.Reader%29)) in Javascript (browser) and Node.js.

This module provides its own TypeScript declarations (.d.ts).

## Installation

```bash
npm install java-props
```

## Example

```properties
# file.properties
a = Hello World
b : Node.js\u00AE
c value
d=foo\
  bar
```

```javascript
const javaProps = require('java-props');

javaProps
    .parseFile('./file.properties')
    .then((props) => {
        console.log(props);
        // { a: 'Hello World', b: 'Node.js®', c: 'value', d: 'foobar' }
    })
    .catch((err) => {
        console.error(err);
    });
```

## Documentation

For detailed API Documentation, see: [https://nathan818fr.github.io/node-java-props/modules.html](https://nathan818fr.github.io/node-java-props/modules.html)

## Building

This project uses TypeScript. To create javascript sources run:

```sh
yarn run build
```

## Testing

To run the test suite, first install the dependencies, then run `yarn test`:

```bash
yarn install
yarn test
```

## Contributing

Contributions are welcome.

The goal is to keep a simple project without unnecessary (non essential) features.
It is recommended to open an issue before introducing new features to discuss them.

## Versioning

We use [SemVer](http://semver.org/) for versioning.
For the versions available, see the [tags on this repository](https://github.com/nathan818fr/node-java-props/tags).

## Authors

-   [Nathan Poirier](https://github.com/nathan818fr) - Initial version

See also the list of [contributors](https://github.com/nathan818fr/node-java-props/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
