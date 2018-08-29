/**
 * @example
 * const javaProps = require('java-props');
 */
const javaProps = {
    /**
     * Parses a .properties string, constructing a corresponding JavaScript object.
     *
     * @param {String} str The string to parse as .properties
     * @return {Object} The {@link Object} corresponding to the given string
     */
    parse: function (str) {
    },

    /**
     * Parses a .properties file, constructing a corresponding JavaScript object.
     *
     * @param {String | Buffer | URL | number} path Filename or file descriptor
     * @param {String} [encoding=utf8] File encoding
     * @return {Promise<Object>} The {@link Object} corresponding to the given string
     */
    parseFile: function (path, encoding) {
    },
};
