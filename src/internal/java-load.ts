import {LoadEra} from './java-version';

// Exact ports of Properties.LineReader.readLine() and Properties.loadConvert(), for each load era.

/**
 * Properties.LineReader.readLine() of a load era. Like Java, it keeps a single line buffer: lines overwrite the start
 * of it, so it can hold stale content of longer previous lines after the current one (or '\0' where nothing was ever
 * written), that Java's decoding reads in some malformed inputs (see {@link tail}).
 */
export class JavaLineReader {
    public pos = 0;
    /** With `track`: offset of the first char of the last line (of its continuation backslash, if empty) */
    public start = -1;
    /** With `track`: offset of the end of the last line (its line terminator, or the end of the input) */
    public end = -1;
    // Java's line buffer, as what each line wrote to it, from the longest to the last one: as lines overwrite its start,
    // only longer previous lines still show after a line
    private written: string[] = [];
    private text = ''; // the last line
    private limit = 0; // end of the current 8192-char read chunk (Java reads its input by chunks)
    private readonly rewritten: boolean; // JDK-8224202 (JDK 11.0.5+ and 13+)
    private readonly str: string;
    private readonly era: LoadEra;
    private readonly track: boolean;

    public constructor(str: string, era: LoadEra, track: boolean) {
        this.str = str;
        this.era = era;
        this.track = track;
        this.rewritten = era === 'jdk11' || era === 'jdk13';
    }

    /** The next logical line, or `undefined` at the end of the input */
    public readLine(): string | undefined {
        return this.rewritten ? this.readLine11() : this.readLine8();
    }

    /**
     * What Java's decoding can read past the last line: the next 5 chars of the buffer when one of the last 5 chars of
     * the line is a backslash (`\` + `uXXXX`), else nothing. It stops at the end of what was ever written: there, Java
     * reads a '\0', which stops any read.
     */
    public tail(): string {
        const len = this.text.length;
        if (this.text.lastIndexOf('\\') < Math.max(0, len - 5)) return '';
        let out = '';
        let i = this.written.length - 1;
        for (let at = len; at < len + 5; at++) {
            while (i >= 0 && this.written[i].length <= at) i--; // the last line that wrote at `at`
            if (i < 0) break;
            out += this.written[i][at];
        }
        return out;
    }

    // A line wrote `written` to the buffer
    private write(written: string): void {
        const lines = this.written;
        while (lines.length > 0 && lines[lines.length - 1].length <= written.length) lines.pop();
        if (written !== '') lines.push(written);
    }

    // The line is the `len` first chars of what it wrote to the buffer (the last one can be a removed backslash)
    private found(written: string, len: number): string {
        this.write(written);
        this.text = len === written.length ? written : written.substring(0, len);
        return this.text;
    }

    // Like Reader.read() on a StringReader: false at the end of the input
    private fill(): boolean {
        if (this.pos >= this.str.length) return false;
        this.limit = Math.min(this.pos + 8192, this.str.length);
        return true;
    }

    // JDK 6 to 12, and 11.0.0 to 11.0.4
    private readLine8(): string | undefined {
        const str = this.str;
        let len = 0;
        let skipWhiteSpace = true;
        let isCommentLine = false;
        let isNewLine = true;
        let appendedLineBegin = false;
        let precedingBackslash = false;
        let skipLF = false;
        // What the line wrote to the buffer, as slices of the input: text + str.substring(segStart, segEnd). Its `len`
        // first chars are the line, then a removed continuation backslash can follow (until overwritten).
        let text = '';
        let segStart = 0;
        let segEnd = 0;
        while (true) {
            if (this.pos >= this.limit && !this.fill()) {
                if (len === 0 || isCommentLine) return undefined;
                this.end = str.length;
                return this.found(text + str.substring(segStart, segEnd), precedingBackslash ? len - 1 : len);
            }
            let c = str[this.pos++];
            if (skipLF) {
                skipLF = false;
                if (c === '\n') continue;
            }
            if (skipWhiteSpace) {
                if (c === ' ' || c === '\t' || c === '\f') continue;
                if (!appendedLineBegin && (c === '\r' || c === '\n')) continue;
                skipWhiteSpace = false;
                appendedLineBegin = false;
            }
            if (isNewLine) {
                isNewLine = false;
                if (c === '#' || c === '!') {
                    isCommentLine = true;
                    if (this.era === 'jdk8') continue;
                    // JDK 9+: skip up to a line break or a backslash (in the current chunk), then go on with it
                    while (this.pos < this.limit) {
                        c = str[this.pos++];
                        if (c === '\n' || c === '\r' || c === '\\') break;
                    }
                }
            }
            if (c !== '\n' && c !== '\r') {
                // Comment lines are written to the buffer too, and their backslashes count
                if (this.track && len === 0 && !isCommentLine) this.start = this.pos - 1;
                if (this.pos - 1 !== segEnd) {
                    text += str.substring(segStart, segStart + len - text.length); // (without a removed backslash)
                    segStart = this.pos - 1;
                }
                segEnd = this.pos;
                len++;
                precedingBackslash = c === '\\' ? !precedingBackslash : false;
            } else {
                if (isCommentLine || len === 0) {
                    this.write(text + str.substring(segStart, segEnd));
                    isCommentLine = false;
                    isNewLine = true;
                    skipWhiteSpace = true;
                    len = 0;
                    text = '';
                    segStart = segEnd = 0;
                    continue;
                }
                this.end = this.pos - 1;
                if (this.pos >= this.limit && !this.fill()) {
                    return this.found(text + str.substring(segStart, segEnd), precedingBackslash ? len - 1 : len);
                }
                if (!precedingBackslash) return this.found(text + str.substring(segStart, segEnd), len);
                len -= 1;
                skipWhiteSpace = true;
                appendedLineBegin = true;
                precedingBackslash = false;
                if (c === '\r') skipLF = true;
            }
        }
    }

    // JDK 11.0.5+ and 13+ (JDK-8224202)
    private readLine11(): string | undefined {
        const str = this.str;
        let len = 0;
        let skipWhiteSpace = true;
        let appendedLineBegin = false;
        let precedingBackslash = false;
        let text = '';
        let segStart = 0;
        let segEnd = 0;
        while (true) {
            if (this.pos >= str.length) {
                if (len === 0) return undefined;
                this.end = str.length;
                return this.found(text + str.substring(segStart, segEnd), precedingBackslash ? len - 1 : len);
            }
            let c = str[this.pos++];
            if (skipWhiteSpace) {
                if (c === ' ' || c === '\t' || c === '\f') continue;
                if (!appendedLineBegin && (c === '\r' || c === '\n')) continue;
                skipWhiteSpace = false;
                appendedLineBegin = false;
            }
            if (len === 0 && (c === '#' || c === '!')) {
                // Comment: skipped up to the end of the line, without touching the buffer
                do {
                    if (this.pos >= str.length) return undefined;
                    c = str[this.pos++];
                } while (c !== '\r' && c !== '\n');
                skipWhiteSpace = true;
                continue;
            }
            if (c !== '\n' && c !== '\r') {
                if (this.track && len === 0) this.start = this.pos - 1;
                if (this.pos - 1 !== segEnd) {
                    text += str.substring(segStart, segStart + len - text.length); // (without a removed backslash)
                    segStart = this.pos - 1;
                }
                segEnd = this.pos;
                len++;
                precedingBackslash = c === '\\' ? !precedingBackslash : false;
            } else {
                if (len === 0) {
                    skipWhiteSpace = true;
                    continue;
                }
                this.end = this.pos - 1;
                if (this.pos >= str.length) {
                    return this.found(text + str.substring(segStart, segEnd), precedingBackslash ? len - 1 : len);
                }
                if (!precedingBackslash) return this.found(text + str.substring(segStart, segEnd), len);
                len -= 1;
                skipWhiteSpace = true;
                appendedLineBegin = true;
                precedingBackslash = false;
                if (c === '\r' && str[this.pos] === '\n') this.pos++;
            }
        }
    }
}

/**
 * Properties.loadConvert() of a load era, on `str`. Like Java, an escape at the end of `str` reads on into `followedBy`,
 * then '\0' (JDK 6 to 12 and 11.0.5+; JDK 13+ checks the bounds of `\uXXXX`).
 */
export function javaDecode(str: string, followedBy: string, era: LoadEra): string {
    const end = str.length;
    let off = str.indexOf('\\');
    // No escape: nothing to decode (Java only reads past the end after a backslash). JDK 11.0.5+ also returns the
    // string as-is when its first backslash is the last char.
    if (off < 0 || ((era === 'jdk11' || era === 'jdk13') && off === end - 1)) return str;
    const after = followedBy + '\0'; // a '\0' always stops a read before the end of `after`
    const at = (i: number) => (i < end ? str[i] : after[i - end]);
    let out = '';
    let start = 0; // start of the text to copy as-is
    while (off >= 0 && off < end) {
        out += str.substring(start, off);
        off++; // backslash
        let c = at(off++);
        if (c === 'u') {
            if (era === 'jdk13' && off > end - 4) throw malformedUnicode();
            let value = 0;
            for (let i = 0; i < 4; i++) {
                const digit = parseInt(at(off++), 16);
                if (Number.isNaN(digit)) throw malformedUnicode();
                value = (value << 4) + digit;
            }
            c = String.fromCharCode(value);
        } else if (c === 't') {
            c = '\t';
        } else if (c === 'r') {
            c = '\r';
        } else if (c === 'n') {
            c = '\n';
        } else if (c === 'f') {
            c = '\f';
        }
        out += c;
        start = off;
        off = start < end ? str.indexOf('\\', start) : -1;
    }
    return start < end ? out + str.substring(start) : out;
}

function malformedUnicode(): Error {
    return new Error('Malformed \\uxxxx encoding.');
}

/** Key/value boundaries of a logical line, like Properties.load0() (the same in every era, and in the original behavior) */
export function splitLine(line: string): {line: string; sepStart: number; valueStart: number} {
    let keyLen = 0;
    let valueStart = line.length;
    let hasSep = false;
    let backslash = false;

    const lineLen = line.length;
    let pos = 0;
    for (; pos < lineLen; pos++) {
        const c = line[pos];
        if ((c === '=' || c === ':') && !backslash) {
            valueStart = keyLen + 1;
            hasSep = true;
            break;
        } else if ((c === ' ' || c === '\t' || c === '\f') && !backslash) {
            valueStart = keyLen + 1;
            break;
        }
        if (c === '\\') {
            backslash = !backslash;
        } else {
            backslash = false;
        }
        keyLen++;
    }
    while (valueStart < lineLen) {
        const c = line[valueStart];
        if (c !== ' ' && c !== '\t' && c !== '\f') {
            if (!hasSep && (c === '=' || c === ':')) {
                hasSep = true;
            } else {
                break;
            }
        }
        valueStart++;
    }

    return {line, sepStart: keyLen, valueStart};
}
