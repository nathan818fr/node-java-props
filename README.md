# java-props &middot; [![Build Status](https://travis-ci.org/nathan818fr/node-java-props.svg?branch=master)](https://travis-ci.org/nathan818fr/node-java-props) [![codecov](https://codecov.io/gh/nathan818fr/node-java-props/branch/master/graph/badge.svg)](https://codecov.io/gh/nathan818fr/node-java-props) [![npm version](https://badge.fury.io/js/java-props.svg)](https://badge.fury.io/js/java-props)

Read/Parse Java .properties files (using the same [specification](https://docs.oracle.com/javase/10/docs/api/java/util/Properties.html#load%28java.io.Reader%29))
in Javascript / Node.js.

Note for TypeScript users:
This module build and provide its TypeScript declarations files (.d.ts).

## Getting Started

**Node.js** &middot; Install the module with:
```sh
npm i --save java-props
```

### Quick Example
```properties
# file.properties
a = Hello World
b : Node.js\u00AE
c value
d=foo\
  bar
```

```
const javaProps = require('java-props');

javaProps.parseFile('./file.properties').then((props) => {
    console.log(props);
    // { a: 'Hello World', b: 'Node.js®', c: 'value', d: 'foobar' }
}).catch((err) => {
    console.error(err)
});
```

## Documentation

<!-- jsdoc2md start -->
<a name="javaProps"></a>

### javaProps
**Example**
```js
const javaProps = require('java-props');
```

* [javaProps](#javaProps)
    * [.parse(str)](#javaProps.parse) ⇒ <code>Object</code>
    * [.parseFile(path, [encoding])](#javaProps.parseFile) ⇒ <code>Promise.&lt;Object&gt;</code>

<a name="javaProps.parse"></a>

#### javaProps.parse(str) ⇒ <code>Object</code>
Parses a .properties string, constructing a corresponding JavaScript object.

**Returns**: <code>Object</code> - The [Object](Object) corresponding to the given string

| Param | Type | Description |
| --- | --- | --- |
| str | <code>String</code> | The string to parse as .properties |

<a name="javaProps.parseFile"></a>

#### javaProps.parseFile(path, [encoding]) ⇒ <code>Promise.&lt;Object&gt;</code>
Parses a .properties file, constructing a corresponding JavaScript object.

**Returns**: <code>Promise.&lt;Object&gt;</code> - The [Object](Object) corresponding to the given string

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| path | <code>String</code> \| <code>Buffer</code> \| <code>URL</code> \| <code>number</code> |  | Filename or file descriptor |
| [encoding] | <code>String</code> | <code>utf8</code> | File encoding |
<!-- jsdoc2md end -->

## Building

This project uses TypeScript. To create javascript sources run:
```sh
npm run build
```

To generate the documentation, edit `documentation.js` then run:
```sh
# npm install -g jsdoc-to-markdown
jsdoc2md --partial doc/scope.hbs --files doc/documentation.js --heading-depth 3 | xclip -selection c
```
and copy the result inside this README.

## Testing

Run the unit tests (no need to run build before, they use the typescript files):
```sh
npm run test
```

## Contributing

Contributions are welcome. Unfortunately there is no documentation on the
codestyle yet, so look at the existing sources and do the same.

The goal is to keep a simple project without unnecessary (non essential)
features.
Don't hesitate to open an issue before to discuss about you idea.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available,
see the [tags on this repository](https://github.com/nathan818fr/node-java-props/tags).

## Authors

- [Nathan Poirier](https://github.com/nathan818fr) - Initial version

See also the list of [contributors](https://github.com/nathan818fr/node-java-props/contributors)
who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE)
file for details.
