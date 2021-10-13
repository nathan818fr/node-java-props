import fs from 'fs';
import {Properties, parse, stringify} from './java-props';

export * from './java-props';

/**
 * Parses a .properties file and returns the result as an object.
 *
 * @param path Filename or file descriptor
 * @param encoding File encoding (default: utf8)
 * @return The result as an object
 *
 * @example ```javascript
 * javaProps.parseFile('./foobar.properties').then((props) => {
 *     console.log(props.foo + ' ' + props.bar);
 *     // "Hello World"
 * }).catch((err) => {
 *     console.error(err);
 * });
 * ```
 * *- or with async/await -*
 * ```javascript
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
export function parseFile(path: string | Buffer | URL | number, encoding?: string): Promise<Properties> {
    return new Promise((resolve, reject) => {
        fs.readFile(path, {encoding: encoding || 'utf8', flag: 'r'}, (err, data) => {
            if (err) {
                return reject(err);
            }
            try {
                const res = parse(data);
                return resolve(res);
            } catch (err) {
                /* istanbul ignore next */
                return reject(err);
            }
        });
    });
}

/**
 * @deprecated
 */
export default {
    parse,
    parseFile,
    stringify,
};
