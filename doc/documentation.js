/**
 */
const javaProps = {
    /**
     * Parses a .properties string, constructing a corresponding JavaScript object.
     *
     * @param {String} str The string to parse as .properties
     * @return {Object} The {@link Object} corresponding to the given string
     * @example
     * const props = javaProps.parse('foo=Hello\nbar=World');
     * console.log(props.foo + ' ' + props.bar);
     * // "Hello World"
     */
    parse: function (str) {
    },

    /**
     * Parses a .properties file, constructing a corresponding JavaScript object.
     *
     * @param {String | Buffer | URL | number} path Filename or file descriptor
     * @param {String} [encoding=utf8] File encoding
     * @return {Promise<Object>} The {@link Object} corresponding to the given string
     * @example
     * ```js
     * javaProps.parseFile('./foobar.properties').then((props) => {
     *     console.log(props.foo + ' ' + props.bar);
     *     // "Hello World"
     * }).catch((err) => {
     *     console.error(err);
     * });
     * ```
     * *- or with async/await -*
     * ```js
     * async function fct() {
     *     try {
     *         const props = await javaProps.parseFile('./foobar.properties');
     *         console.log(props.foo + ' ' + props.bar);
     *         // "Hello World"
     *     } catch (err) {
     *         console.error(err);
     *     }
     * }
     * ```
     */
    parseFile: function (path, encoding) {
    },

    /**
     * Convert a JavaScript object to the corresponding .properties string.
     *
     * @param {Object} props The JavaScript object to convert
     * @return {String} The .properties string corresponding to the given JavaScript object
     * @example
     * const str = javaProps.stringify({'foo': 'Hello', 'bar': 'World'});
     * console.log(str);
     * // "foo: Hello\nbar: World\n"
     */
    stringify: function (props) {
    },
};
