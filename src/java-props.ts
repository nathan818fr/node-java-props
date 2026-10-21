import {EntryReaderImpl} from './internal/entry-reader';
import {dateComment, escapeSettings, saveConvert, storeSettings, writeComments} from './internal/java-store';
import {loadEra} from './internal/java-version';

export interface Properties {
    [key: string]: string;
}

export interface ParseOptions {
    /**
     * Parse exactly like `Properties.load()` of this Java version: a major version (`8`, `17`...), a `java.version`
     * string (`'11.0.4'`, `'1.8.0_392'`...) or `'latest'`. Without it, java-props keeps its original behavior, which
     * differs from Java on a few unusual inputs. It is resolved once per call: a number is the cheapest form.
     */
    javaVersion?: number | string;
}

/**
 * Parses a .properties string.
 *
 * @param str The .properties content
 * @param options See {@link ParseOptions}
 * @return The properties, as an object with a `null` prototype
 * @throws Error on malformed `\uXXXX` escapes (where Java throws an `IllegalArgumentException`)
 * @throws TypeError | RangeError if `options.javaVersion` is invalid
 *
 * @example ```javascript
 * parse('foo=Hello\nbar=World');
 * // {foo: 'Hello', bar: 'World'}
 * ```
 */
export function parse(str: string, options?: ParseOptions): Properties {
    const result: Properties = Object.create(null);
    const reader = readEntries(str, options);
    while (reader.next()) {
        result[reader.key] = reader.value;
    }
    return result;
}

export interface ReadEntriesOptions extends ParseOptions {
    /** Also give the position of each entry in the input: see {@link EntryPositions} */
    positions?: boolean;
}

/**
 * Reads the entries of a .properties string, one at a time, in order (duplicate keys included). Its properties are
 * computed on first access, and are only valid after {@link EntryReader.next} returned `true`.
 */
export interface EntryReader {
    /** Goes to the next entry, and returns `false` at the end of the input */
    next(): boolean;
    /** The logical line of the entry (continuation lines joined), with its escape sequences */
    readonly line: string;
    /** The key, with its escape sequences */
    readonly rawKey: string;
    /** The value, with its escape sequences */
    readonly rawValue: string;
    /** The decoded key. Throws an `Error` on malformed `\uXXXX` escapes (where Java throws). */
    readonly key: string;
    /** The decoded value. Throws an `Error` on malformed `\uXXXX` escapes (where Java throws). */
    readonly value: string;
}

/** Position of the current entry in the input (with the `positions` option) */
export interface EntryPositions {
    /** Offset of the entry's first char (or of its continuation backslash, for an empty entry) */
    readonly start: number;
    /** Offset of the end of the entry: its line terminator, or the end of the input */
    readonly end: number;
    /** Line of `start` (from 1; CR, LF and CRLF end a line, like in Java) */
    readonly startLine: number;
    /** Column of `start` (from 1, in UTF-16 code units) */
    readonly startColumn: number;
}

/**
 * Reads the entries of a .properties string one at a time: for order, duplicate keys, raw text, positions, or fast
 * partial reads (nothing is decoded until accessed).
 *
 * @param str The .properties content
 * @param options See {@link ReadEntriesOptions}
 * @throws TypeError | RangeError if `options.javaVersion` is invalid
 *
 * @example ```javascript
 * const reader = readEntries('a=1\nb=2');
 * while (reader.next()) {
 *     console.log(reader.key, reader.value);
 * }
 * ```
 */
export function readEntries(str: string, options: ReadEntriesOptions & {positions: true}): EntryReader & EntryPositions;
export function readEntries(str: string, options?: ReadEntriesOptions): EntryReader;
export function readEntries(str: string, options?: ReadEntriesOptions): EntryReader {
    const era = options && options.javaVersion !== undefined ? loadEra(options.javaVersion) : undefined;
    return new EntryReaderImpl(str, era, !!options && !!options.positions);
}

export interface EscapeOptions {
    /**
     * Escape like `Properties.store()` of this Java version (same forms as {@link ParseOptions.javaVersion}): it sets
     * the defaults of the other options.
     */
    javaVersion?: number | string;
    /** Also escape `=`, `:`, `#` and `!` in values, like `store()` (default: `false`, or `true` with `javaVersion`) */
    escapeValueSpecials?: boolean;
    /**
     * Escape the characters outside of printable ASCII as `\uXXXX`, like `store(OutputStream)` (default: `true`, or
     * `false` with `javaVersion`, like `store(Writer)`)
     */
    escapeUnicode?: boolean;
}

/**
 * Options of {@link stringify}. Without `javaVersion`, they default to the original output of java-props; with it,
 * they default to the output of `Properties.store(Writer)`.
 */
export interface StringifyOptions extends EscapeOptions {
    /** Separator between keys and values (default: `': '`, or `'='` with `javaVersion`) */
    separator?: '=' | ':' | ' ' | ': ' | ' = ';
    /** Comments written at the start, like the `comments` argument of `Properties.store()` */
    comments?: string;
    /**
     * Date comment, written after `comments` (default: `false`, or `true` with `javaVersion`): `true` (the current date)
     * or a `Date`, written like Java's `Date.toString()`; or a string, written as a comment like the
     * `java.properties.date` system property of Java 18+.
     */
    date?: boolean | Date | string;
    /**
     * IANA time zone of the date comment (default: the system time zone, like the JVM). Time zone names can differ from
     * Java's own names: use a fixed offset (`'+02:00'`), `'UTC'`, or a `date` string for an exact output.
     */
    timeZone?: string;
    /** Line separator (default: `'\n'`, or the system one with `javaVersion`, like Java: `'\r\n'` on Windows) */
    lineSeparator?: '\n' | '\r\n' | '\r';
    /**
     * Order of the properties (default: `'insertion'`, or `'sorted'` with `javaVersion`, like Java 18+). JavaScript
     * objects list integer-like keys first, in ascending order.
     */
    order?: 'insertion' | 'sorted';
}

/**
 * Converts an object of string values (its own enumerable properties) to a .properties string, which Java reads back
 * as the same keys and values.
 *
 * @param props The properties
 * @param options See {@link StringifyOptions}
 * @return The .properties content
 * @throws TypeError if a value is not a string, or if `options.javaVersion` has an invalid type
 * @throws RangeError if `options.javaVersion` or `options.timeZone` is invalid
 *
 * @example ```javascript
 * stringify({foo: 'Hello', bar: 'World'});
 * // 'foo: Hello\nbar: World\n'
 * ```
 */
export function stringify(props: Properties, options?: StringifyOptions): string {
    const settings = storeSettings(options);
    const nl = settings.lineSeparator;
    let str = '';
    if (settings.comments !== undefined) {
        str += writeComments(settings.comments, nl);
    }
    if (settings.date !== false) {
        str += dateComment(settings.date, settings.timeZone, nl);
    }
    const keys: string[] = [];
    for (const key in props) {
        if (Object.prototype.hasOwnProperty.call(props, key)) keys.push(key);
    }
    if (settings.order === 'sorted') keys.sort();
    for (const key of keys) {
        const value = props[key];
        if (typeof value !== 'string') {
            throw new TypeError(`The value of ${JSON.stringify(key)} is not a string (${typeof value})`);
        }
        const escapedKey = saveConvert(key, true, true, settings.escapeUnicode);
        const escapedValue = saveConvert(value, false, settings.escapeValueSpecials, settings.escapeUnicode);
        str += escapedKey + settings.separator + escapedValue + nl;
    }
    return str;
}

/**
 * Escapes a key: spaces, separators, comment chars, and by default the characters outside of printable ASCII.
 *
 * @throws TypeError if `key` is not a string, or if `options.javaVersion` has an invalid type
 * @throws RangeError if `options.javaVersion` is invalid
 */
export function escapeKey(key: string, options?: EscapeOptions): string {
    return escapeText(key, true, options);
}

/**
 * Escapes a value: its leading space, and by default the characters outside of printable ASCII.
 *
 * @throws TypeError if `value` is not a string, or if `options.javaVersion` has an invalid type
 * @throws RangeError if `options.javaVersion` is invalid
 */
export function escapeValue(value: string, options?: EscapeOptions): string {
    return escapeText(value, false, options);
}

function escapeText(str: string, isKey: boolean, options: EscapeOptions | undefined): string {
    if (typeof str !== 'string') throw new TypeError(`Expected a string, got ${typeof str}`);
    const settings = escapeSettings(options);
    return saveConvert(str, isKey, isKey || settings.escapeValueSpecials, settings.escapeUnicode);
}

const _default = {
    parse,
    stringify,
};
/**
 * @deprecated Use the named exports.
 */
export default _default;
