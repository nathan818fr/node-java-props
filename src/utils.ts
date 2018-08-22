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
