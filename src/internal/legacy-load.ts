// The original reading of java-props (a port of JDK 8's, with differences kept to not break existing code).

const UNICODE_PATTERN = /^[0-9a-fA-F]{4}$/;

/**
 * Reads the logical lines of a string, like java-props always did: skips comments, blank lines and leading whitespace,
 * and joins continuation lines. With `track`, it also gives the range of each line in the input.
 */
export class LegacyLineReader {
    public pos = 0;
    /** With `track`: offset of the first char of the last line (of its continuation backslash, if empty) */
    public start = -1;
    /** With `track`: offset of the end of the last line (its line terminator, or the end of the input) */
    public end = -1;
    private readonly str: string;
    private readonly track: boolean;

    public constructor(str: string, track: boolean) {
        this.str = str;
        this.track = track;
    }

    /** The next logical line, or `undefined` at the end of the input */
    public readLine(): string | undefined {
        const str = this.str;
        let skipWhiteSpace = true;
        let commentLine = false;
        let newLine = true;
        let appendedLineBegin = false;
        let backslash = false;
        let skipLF = false;
        // The line (of `len` chars), as slices of the input: text + str.substring(segStart, segEnd)
        let len = 0;
        let text = '';
        let segStart = 0;
        let segEnd = 0;
        while (this.pos < str.length) {
            const c = str[this.pos++];
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
            if (newLine) {
                newLine = false;
                if (c === '#' || c === '!') {
                    commentLine = true;
                    continue;
                }
            }
            if (c !== '\n' && c !== '\r') {
                if (this.track && len === 0 && !commentLine) this.start = this.pos - 1;
                len++;
                if (this.pos - 1 !== segEnd) {
                    text += str.substring(segStart, segEnd);
                    segStart = this.pos - 1;
                }
                segEnd = this.pos;
                backslash = c === '\\' ? !backslash : false;
            } else {
                if (commentLine || len === 0) {
                    commentLine = false;
                    newLine = true;
                    skipWhiteSpace = true;
                    len = 0;
                    text = '';
                    segStart = segEnd = 0;
                    continue;
                }
                if (!backslash) {
                    this.end = this.pos - 1;
                    return text + str.substring(segStart, segEnd);
                }
                len--;
                segEnd--;
                skipWhiteSpace = true;
                appendedLineBegin = true;
                backslash = false;
                if (c === '\r') skipLF = true;
            }
        }
        if (backslash && len > 0) {
            // (`backslash` can be left over from a comment line)
            len--;
            segEnd--;
        }
        if (len === 0 || commentLine) return undefined;
        this.end = str.length;
        return text + str.substring(segStart, segEnd);
    }
}

/** Decodes the escape sequences of a key or a value, like java-props always did */
export function legacyDecode(line: string): string {
    let off = line.indexOf('\\');
    if (off < 0) return line;
    let out = '';
    let start = 0; // start of the text to copy as-is
    while (off >= 0) {
        out += line.substring(start, off);
        off++; // backslash
        const c = line[off];
        if (c === 'u') {
            // Up to 4 chars of the same line (originally: `\\u(.{0,4})`), that must be hex digits
            off++;
            let end = off;
            while (end < off + 4 && end < line.length && !isLineTerminator(line[end])) end++;
            const unicode = line.substring(off, end);
            if (!UNICODE_PATTERN.test(unicode)) throw new Error('Malformed \\uxxxx encoding.');
            out += String.fromCharCode(parseInt(unicode, 16));
            off = end;
        } else if (c !== undefined && !isLineTerminator(c)) {
            out += c === 't' ? '\t' : c === 'r' ? '\r' : c === 'n' ? '\n' : c === 'f' ? '\f' : c;
            off++;
        } // else, the backslash is dropped
        start = off;
        off = line.indexOf('\\', start);
    }
    return out + line.substring(start);
}

// The chars that `.` doesn't match in a regex
function isLineTerminator(c: string): boolean {
    return c === '\n' || c === '\r' || c === '\u2028' || c === '\u2029';
}
