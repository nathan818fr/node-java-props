// What Properties.store() writes: escaped keys and values, comments, the date comment, and the line separator.
import {EscapeOptions, StringifyOptions} from '../java-props';
import {loadEra} from './java-version';

/** The settings of an escapeKey()/escapeValue() output, see {@link escapeSettings} */
export interface EscapeSettings {
    escapeValueSpecials: boolean;
    escapeUnicode: boolean;
}

/** The settings of a stringify() output, see {@link storeSettings} */
export interface StoreSettings extends EscapeSettings {
    separator: string;
    lineSeparator: string;
    comments: string | undefined;
    date: boolean | Date | string;
    timeZone: string | undefined;
    order: 'insertion' | 'sorted';
}

/**
 * Resolves the options of escapeKey()/escapeValue(): each option, else its default: like `Properties.store(Writer)`
 * with `javaVersion`, else like the original output of java-props.
 *
 * @throws TypeError | RangeError if `options.javaVersion` is invalid
 */
export function escapeSettings(options: EscapeOptions = {}): EscapeSettings {
    const store = isStore(options);
    return {
        escapeValueSpecials: pick(options.escapeValueSpecials, store, true, false),
        escapeUnicode: pick(options.escapeUnicode, store, false, true),
    };
}

/**
 * Resolves the options of stringify(), like {@link escapeSettings}.
 *
 * @throws TypeError | RangeError if `options.javaVersion` is invalid
 */
export function storeSettings(options: StringifyOptions = {}): StoreSettings {
    const store = isStore(options);
    const {escapeValueSpecials, escapeUnicode} = escapeSettings(options);
    return {
        escapeValueSpecials,
        escapeUnicode,
        separator: pick<string>(options.separator, store, '=', ': '),
        lineSeparator: pick<string>(options.lineSeparator, store, systemLineSeparator(), '\n'),
        comments: options.comments,
        date: pick<boolean | Date | string>(options.date, store, true, false),
        timeZone: options.timeZone,
        order: pick<'insertion' | 'sorted'>(options.order, store, 'sorted', 'insertion'),
    };
}

// With `javaVersion`, the defaults are like Properties.store() (every version writes the same: only validated)
function isStore(options: EscapeOptions): boolean {
    if (options.javaVersion === undefined) return false;
    loadEra(options.javaVersion);
    return true;
}

function pick<T>(value: T | undefined, store: boolean, storeDefault: T, originalDefault: T): T {
    return value !== undefined ? value : store ? storeDefault : originalDefault;
}

/** `System.lineSeparator()`: `'\r\n'` on Windows, `'\n'` elsewhere (and in browsers) */
export function systemLineSeparator(): string {
    return typeof process !== 'undefined' && process.platform === 'win32' ? '\r\n' : '\n';
}

/** `Properties.writeComments()`: comment lines, `\uXXXX` escapes above U+00FF */
export function writeComments(comments: string, nl: string): string {
    let out = '#';
    let last = 0;
    for (let current = 0; current < comments.length; current++) {
        const code = comments.charCodeAt(current);
        if (code > 0xff || code === 0x0a || code === 0x0d) {
            out += comments.substring(last, current);
            if (code > 0xff) {
                out += '\\u' + hex4(code);
            } else {
                out += nl;
                if (code === 0x0d && current !== comments.length - 1 && comments[current + 1] === '\n') {
                    current++;
                }
                const next = comments[current + 1];
                if (current === comments.length - 1 || (next !== '#' && next !== '!')) {
                    out += '#';
                }
            }
            last = current + 1;
        }
    }
    return out + comments.substring(last) + nl;
}

/**
 * The date comment of `Properties.store()`: `Date.toString()` of a date (`true` = now), or a string written like the
 * `java.properties.date` system property of Java 18+ (an empty string means now, like in Java).
 *
 * @throws RangeError if `timeZone` is invalid, or is not `'UTC'` nor a fixed offset without `Intl` support
 */
export function dateComment(date: true | Date | string, timeZone: string | undefined, nl: string): string {
    if (typeof date === 'string' && date !== '') return writeComments(date, nl);
    return '#' + javaDateString(date instanceof Date ? date : new Date(), timeZone) + nl;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ZONE_NAME = /^[A-Z]{2,5}$/;

// Date.toString() of Java: "EEE MMM dd HH:mm:ss zzz yyyy"
function javaDateString(date: Date, timeZone: string | undefined): string {
    const {offset, zone} = zoneAt(date, timeZone);
    const d = new Date(Math.floor(date.getTime() / 1000) * 1000 + offset * 60000);
    return (
        `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${pad2(d.getUTCDate())} ` +
        `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} ${zone} ${d.getUTCFullYear()}`
    );
}

// Offset (in minutes) and short name of a time zone at a date
function zoneAt(date: Date, timeZone: string | undefined): {offset: number; zone: string} {
    const fixed = timeZone !== undefined ? /^([+-])(\d\d):(\d\d)$/.exec(timeZone) : null;
    if (fixed) {
        const offset = (fixed[1] === '-' ? -1 : 1) * (Number(fixed[2]) * 60 + Number(fixed[3]));
        return {offset, zone: `GMT${fixed[1]}${fixed[2]}:${fixed[3]}`};
    }
    if (timeZone === 'UTC') return {offset: 0, zone: 'UTC'};
    const formatToParts = typeof Intl !== 'undefined' && Intl.DateTimeFormat.prototype.formatToParts;
    if (!formatToParts) {
        if (timeZone !== undefined) throw new RangeError(`Unsupported timeZone ${timeZone}: no Intl support`);
        const offset = -date.getTimezoneOffset();
        return {offset, zone: gmtName(offset)};
    }
    const parts = (locale: string) =>
        new Intl.DateTimeFormat(locale, {
            timeZone,
            hour12: false,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            timeZoneName: 'short',
        }).formatToParts(date);
    const us = parts('en-US');
    const value = (p: Intl.DateTimeFormatPart[], type: string) =>
        (p.find((x) => x.type === type) as Intl.DateTimeFormatPart).value;
    const field = (type: string) => Number(value(us, type));
    const local = Date.UTC(
        field('year'),
        field('month') - 1,
        field('day'),
        field('hour') % 24,
        field('minute'),
        field('second')
    );
    const offset = Math.round((local - Math.floor(date.getTime() / 1000) * 1000) / 60000);
    // Java's names are not available: en-US names (EST...), then en-GB ones (CET...), then Java's "GMT+01:00" format
    let zone = value(us, 'timeZoneName');
    if (!ZONE_NAME.test(zone)) zone = value(parts('en-GB'), 'timeZoneName');
    return {offset, zone: ZONE_NAME.test(zone) ? zone : gmtName(offset)};
}

// Java's name of a custom time zone ("GMT+01:00")
function gmtName(offset: number): string {
    const abs = Math.abs(offset);
    return `GMT${offset < 0 ? '-' : '+'}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

function pad2(n: number): string {
    return n < 10 ? '0' + n : String(n);
}

function hex4(code: number): string {
    const hex = code.toString(16).toUpperCase();
    return '0000'.substring(hex.length) + hex;
}

/** `Properties.saveConvert()`, with the escaping of `=:#!` as an option (Java always escapes them) */
export function saveConvert(
    str: string,
    escapeSpace: boolean,
    escapeSpecials: boolean,
    escapeUnicode: boolean
): string {
    let out = '';
    let start = 0; // start of the text to copy as-is
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        const code = str.charCodeAt(i);
        let escaped: string;
        if (code > 61 && code < 127) {
            if (c !== '\\') continue;
            escaped = '\\\\';
        } else if (c === ' ') {
            if (i !== 0 && !escapeSpace) continue;
            escaped = '\\ ';
        } else if (c === '\t') {
            escaped = '\\t';
        } else if (c === '\n') {
            escaped = '\\n';
        } else if (c === '\r') {
            escaped = '\\r';
        } else if (c === '\f') {
            escaped = '\\f';
        } else if (c === '=' || c === ':' || c === '#' || c === '!') {
            if (!escapeSpecials) continue;
            escaped = '\\' + c;
        } else if ((code < 0x20 || code > 0x7e) && escapeUnicode) {
            escaped = '\\u' + hex4(code);
        } else {
            continue;
        }
        out += str.substring(start, i) + escaped;
        start = i + 1;
    }
    return start === 0 ? str : out + str.substring(start);
}
