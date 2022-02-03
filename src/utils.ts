const DECODE_PATTERN = /(?:\\u(.{0,4})|\\(.?))/g;
const UNICODE_PATTERN = /^[0-9a-fA-F]{4}$/;

const ENCODE_PATTERN = /(?:[\u0000-\u001F\\\u007F-\uFFFF])/g;
const ENCODE_KEY_PATTERN = /(?:[\u0000-\u0020!#:=\\\u007F-\uFFFF])/g; // ENCODE_PATTERN with separators + comments

export interface ParsedLine {
    line: string;
    sepStart: number;
    valueStart: number;
}

export function rawParse(str: string, consumeFn: (res: ParsedLine) => void): void {
    const lr = new LineReader(str);
    let line;
    while ((line = lr.readLine()) !== undefined) {
        consumeFn(rawParseLine(line));
    }
}

export function rawParseLine(line: string): ParsedLine {
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

export function decodeLine(line: string): string {
    return line.replace(DECODE_PATTERN, (_, unicode, char) => {
        if (unicode !== undefined) {
            if (!unicode.match(UNICODE_PATTERN)) {
                throw new Error('Malformed \\uxxxx encoding.');
            }
            const charVal = parseInt(unicode, 16);
            return String.fromCharCode(charVal);
        } else if (char === 't') {
            return '\t';
        } else if (char === 'r') {
            return '\r';
        } else if (char === 'n') {
            return '\n';
        } else if (char === 'f') {
            return '\f';
        } else {
            return char;
        }
    });
}

export function encodeLine(line: string, isKey?: boolean): string {
    let str = line.replace(isKey ? ENCODE_KEY_PATTERN : ENCODE_PATTERN, (c) => {
        if (c === '\t') {
            return '\\t';
        } else if (c === '\r') {
            return '\\r';
        } else if (c === '\n') {
            return '\\n';
        } else if (c === '\f') {
            return '\\f';
        } else if (c >= ' ' && c <= '~') {
            return '\\' + c;
        } else {
            const code = c.charCodeAt(0);
            if (code < 16) return '\\u000' + code.toString(16).toUpperCase();
            if (code < 256) return '\\u00' + code.toString(16).toUpperCase();
            if (code < 4096) return '\\u0' + code.toString(16).toUpperCase();
            return '\\u' + code.toString(16).toUpperCase();
        }
    });
    if (!isKey) {
        const c = str.charAt(0);
        if (c === ' ' || c === '\t' || c === '\f') {
            str = '\\' + str;
        }
    }
    return str;
}

/**
 * @deprecated Use {@link #decodeLine}.
 */
export const convertLine = decodeLine;

export class LineReader {
    public readonly str: string;
    public readonly strLen: number;
    public pos = 0;

    public constructor(str: string) {
        this.str = str;
        this.strLen = str.length;
    }

    public readLine(): string {
        let skipWhiteSpace = true;
        let commentLine = false;
        let newLine = true;
        let appendedLineBegin = false;
        let backslash = false;
        let skipLF = false;
        let line = '';
        while (this.pos < this.strLen) {
            const c = this.str[this.pos++];
            if (skipLF) {
                skipLF = false;
                if (c === '\n') {
                    continue;
                }
            }
            if (skipWhiteSpace) {
                if (c === ' ' || c === '\t' || c === '\f') {
                    continue;
                }
                if (!appendedLineBegin && (c === '\r' || c === '\n')) {
                    continue;
                }
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
                line += c;
                if (c === '\\') {
                    backslash = !backslash;
                } else {
                    backslash = false;
                }
            } else {
                // reached EOL
                if (commentLine || line === '') {
                    commentLine = false;
                    newLine = true;
                    skipWhiteSpace = true;
                    line = '';
                    continue;
                }
                if (backslash) {
                    line = line.substring(0, line.length - 1);
                    skipWhiteSpace = true;
                    appendedLineBegin = true;
                    backslash = false;
                    if (c === '\r') {
                        skipLF = true;
                    }
                } else {
                    return line;
                }
            }
        }
        if (backslash) {
            line = line.substring(0, line.length - 1);
        }
        if (line === '' || commentLine) {
            return undefined;
        }
        return line;
    }
}
