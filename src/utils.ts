const CONVERT_RXP = /(?:\\u(.{0,4})|\\(.?))/g;
const UNICODE_RXP = /^[0-9a-fA-F]{4}$/;

export function convertLine(line: string): string {
    return line.replace(CONVERT_RXP, (_, unicode, char) => {
        if (unicode !== undefined) {
            if (!unicode.match(UNICODE_RXP)) {
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

export class LineReader {
    private readonly str: string;
    private readonly strLen: number;
    private pos = 0;

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
