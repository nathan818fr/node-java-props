/// <reference types="node" preserve="true" />
import fs from 'fs';
import {loadEra} from './internal/java-version';
import {ParseOptions, Properties, parse, stringify} from './java-props';

export * from './java-props';

export interface ParseFileOptions extends ParseOptions {
    /** File encoding (default: `'utf8'`). Use `'latin1'` for files written by `Properties.store(OutputStream)`. */
    encoding?: string;
}

/**
 * Reads and parses a .properties file.
 *
 * @param path A file path, or a file descriptor
 * @param encoding File encoding (default: `'utf8'`)
 * @param options See {@link ParseOptions}
 * @return A promise of the properties (see {@link parse}). It rejects if the file can't be read, if the encoding is
 *   unknown, or if {@link parse} throws.
 *
 * @example ```javascript
 * await parseFile('./config.properties');
 * await parseFile('./config.properties', {encoding: 'latin1', javaVersion: 21});
 * ```
 */
export function parseFile(
    path: string | Buffer | URL | number,
    encoding?: string,
    options?: ParseOptions
): Promise<Properties>;
/**
 * Reads and parses a .properties file (see the other signature).
 *
 * @param path A file path, or a file descriptor
 * @param options The file encoding, and the options of {@link parse}
 */
export function parseFile(path: string | Buffer | URL | number, options?: ParseFileOptions): Promise<Properties>;
export function parseFile(
    path: string | Buffer | URL | number,
    encodingOrOptions?: string | ParseFileOptions,
    parseOptions?: ParseOptions
): Promise<Properties> {
    const fileOptions =
        typeof encodingOrOptions === 'object' && encodingOrOptions !== null ? encodingOrOptions : undefined;
    const encoding = fileOptions ? fileOptions.encoding : (encodingOrOptions as string | undefined);
    const options = fileOptions || parseOptions;
    return new Promise((resolve, reject) => {
        // Invalid options reject before reading the file
        if (options && options.javaVersion !== undefined) loadEra(options.javaVersion);
        // `encoding` accepts any string: unknown encodings reject
        fs.readFile(path, {encoding: (encoding || 'utf8') as BufferEncoding}, (err, data) => {
            if (err) {
                return reject(err);
            }
            try {
                return resolve(parse(data, options));
            } catch (err) {
                return reject(err);
            }
        });
    });
}

const _default = {
    parse,
    parseFile,
    stringify,
};
/**
 * @deprecated Use the named exports.
 */
export default _default;
