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

<!-- jsdoc2md start -->

* [javaProps](#javaProps)
    * [.parse(str)](#javaProps.parse) ⇒ <code>Object</code>
    * [.parseFile(path, [encoding])](#javaProps.parseFile) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.stringify(props)](#javaProps.stringify) ⇒ <code>String</code>

<a name="javaProps.parse"></a>

### javaProps.parse(str) ⇒ <code>Object</code>
Parses a .properties string, constructing a corresponding JavaScript object.

**Returns**: <code>Object</code> - The [Object](Object) corresponding to the given string  

| Param | Type | Description |
| --- | --- | --- |
| str | <code>String</code> | The string to parse as .properties |

**Example**  
```js
const props = javaProps.parse('foo=Hello\nbar=World');
console.log(props.foo + ' ' + props.bar);
// "Hello World"
```
<a name="javaProps.parseFile"></a>

### javaProps.parseFile(path, [encoding]) ⇒ <code>Promise.&lt;Object&gt;</code>
Parses a .properties file, constructing a corresponding JavaScript object.

**Returns**: <code>Promise.&lt;Object&gt;</code> - The [Object](Object) corresponding to the given string  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| path | <code>String</code> \| <code>Buffer</code> \| <code>URL</code> \| <code>number</code> |  | Filename or file descriptor |
| [encoding] | <code>String</code> | <code>utf8</code> | File encoding |

**Example**  
```js
javaProps.parseFile('./foobar.properties').then((props) => {
    console.log(props.foo + ' ' + props.bar);
    // "Hello World"
}).catch((err) => {
    console.error(err);
});
```
*- or with async/await -*
```js
async function fct() {
    try {
        const props = await javaProps.parseFile('./foobar.properties');
        console.log(props.foo + ' ' + props.bar);
        // "Hello World"
    } catch (err) {
        console.error(err);
    }
}
```
<a name="javaProps.stringify"></a>

### javaProps.stringify(props) ⇒ <code>String</code>
Convert a JavaScript object to the corresponding .properties string.

**Returns**: <code>String</code> - The .properties string corresponding to the given JavaScript object  

| Param | Type | Description |
| --- | --- | --- |
| props | <code>Object</code> | The JavaScript object to convert |

**Example**  
```js
const str = javaProps.stringify({'foo': 'Hello', 'bar': 'World'});
console.log(str);
// "foo: Hello\nbar: World\n"
```

<!-- jsdoc2md end -->

## Building

This project uses TypeScript. To create javascript sources run:

```sh
yarn run build
```

To generate the documentation, edit `documentation.js` then run:

```sh
# npm install -g jsdoc-to-markdown
jsdoc2md --partial doc/scope.hbs --files doc/documentation.js --heading-depth 3 | xclip -selection c
```

and copy the result inside this README.

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
