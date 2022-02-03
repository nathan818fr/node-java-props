import {decodeLine, encodeLine, rawParse} from './utils';

export interface Properties {
    [key: string]: string;
}

/**
 * Parses a .properties string and returns the result as an object.
 *
 * @param str The string to parse as .properties
 * @return The result as an object
 *
 * @example ```javascript
 * const props = javaProps.parse('foo=Hello\nbar=World');
 * console.log(props.foo + ' ' + props.bar);
 * // "Hello World"
 * ```
 */
export function parse(str: string): Properties {
    const result: Properties = Object.create(null);
    rawParse(str, (res) => {
        const key = decodeLine(res.line.substring(0, res.sepStart));
        result[key] = decodeLine(res.line.substring(res.valueStart));
    });
    return result;
}

/**
 * Converts a JavaScript object (associating keys to string values) to a .properties string.
 *
 * @param props The JavaScript object to convert
 * @return The .properties string corresponding to the given JavaScript object
 *
 * @example ```javascript
 * const str = javaProps.stringify({'foo': 'Hello', 'bar': 'World'});
 * console.log(str);
 * // "foo: Hello\nbar: World\n"
 * ```
 */
export function stringify(props: Properties): string {
    let str = '';
    for (const key in props) {
        if (Object.prototype.hasOwnProperty.call(props, key)) {
            const value = props[key];
            str += encodeLine(key, true) + ': ' + encodeLine(value) + '\n';
        }
    }
    return str;
}

/**
 * @deprecated
 */
export default {
    parse,
    stringify,
};
