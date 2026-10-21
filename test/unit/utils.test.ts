import {describe, expect, it} from 'vitest';
import {
    convertLine,
    decodeLine,
    encodeLine,
    LineReader,
    type ParsedLine,
    rawParse,
    rawParseLine,
} from '../../src/utils';

const converts: Record<string, string> = {
    t: '\t',
    r: '\r',
    n: '\n',
    f: '\f',
};

describe('utils.decodeLine', () => {
    for (const [char, repl] of Object.entries(converts)) {
        it(`decodes \\${char}`, () => {
            expect(decodeLine(`abc\\${char}def\\${char}ghi`)).toBe(`abc${repl}def${repl}ghi`);
        });
    }

    it('drops the backslash of other escapes', () => {
        expect(decodeLine('a\\bc\\def\\\\')).toBe('abcdef\\');
    });

    it('decodes \\uXXXX', () => {
        expect(decodeLine('\\u0058 \\u2764')).toBe('X ❤');
        expect(decodeLine('\\u00580')).toBe('X0');
        expect(decodeLine('\\u0058A\\u2764Test')).toBe('XA❤Test');
        expect(decodeLine('\\u002F \\u002f')).toBe('/ /');
        expect(decodeLine('\\uD83D\\uDC51')).toBe('👑');
    });

    it('throws on malformed \\uXXXX', () => {
        expect(() => decodeLine('\\u')).toThrow('Malformed \\uxxxx encoding.');
        expect(() => decodeLine('\\u58')).toThrow('Malformed \\uxxxx encoding.');
        expect(() => decodeLine('\\u27g4')).toThrow('Malformed \\uxxxx encoding.');
    });

    it('decodes escaped backslashes', () => {
        expect(decodeLine('test\\nand\\\\n \\\\\\n')).toBe('test\nand\\n \\\n');
        expect(decodeLine('abc \\\\u0000')).toBe('abc \\u0000');
        expect(decodeLine('abc \\\\uxxxx')).toBe('abc \\uxxxx');
    });

    it('drops a trailing lone backslash', () => {
        expect(decodeLine('abc\\')).toBe('abc');
    });

    it('has the deprecated convertLine alias', () => {
        expect(convertLine).toBe(decodeLine);
    });
});

for (const isKey of [false, true]) {
    const encode = (line: string) => encodeLine(line, isKey);
    describe(`utils.encodeLine (isKey=${isKey})`, () => {
        for (const [char, repl] of Object.entries(converts)) {
            it(`encodes \\${char}`, () => {
                expect(encode(`abc${repl}def${repl}ghi`)).toBe(`abc\\${char}def\\${char}ghi`);
            });
        }

        it('escapes special chars', () => {
            expect(encode('!# :=\\')).toBe(isKey ? '\\!\\#\\ \\:\\=\\\\' : '!# :=\\\\');
        });

        if (!isKey) {
            it('escapes leading whitespace', () => {
                expect(encode('  abc def ghi jkl ')).toBe('\\  abc def ghi jkl ');
                expect(encode('\tabc')).toBe('\\tabc');
            });
        }

        it('keeps printable ASCII chars', () => {
            let str = '';
            for (let cc = 33; cc < 127; ++cc) {
                const c = String.fromCharCode(cc);
                if (c === '\\' || (isKey && (c === '!' || c === '#' || c === ' ' || c === ':' || c === '='))) {
                    continue;
                }
                str += c;
            }
            expect(encode(str)).toBe(str);
        });

        it('encodes other chars as \\uXXXX', () => {
            expect(encode('\0')).toBe('\\u0000');
            expect(encode('\u0014')).toBe('\\u0014');
            expect(encode('\u007F')).toBe('\\u007F');
            expect(encode('é')).toBe('\\u00E9');
            expect(encode('👑')).toBe('\\uD83D\\uDC51');
            expect(encode(String.fromCharCode(15))).toBe('\\u000F');
            expect(encode(String.fromCharCode(16))).toBe('\\u0010');
            expect(encode(String.fromCharCode(255))).toBe('\\u00FF');
            expect(encode(String.fromCharCode(256))).toBe('\\u0100');
            expect(encode(String.fromCharCode(4095))).toBe('\\u0FFF');
            expect(encode(String.fromCharCode(4096))).toBe('\\u1000');
            expect(encode(String.fromCharCode(65535))).toBe('\\uFFFF');
        });
    });
}

describe('utils.encodeLine', () => {
    it('defaults to value encoding', () => {
        expect(encodeLine(' a=b')).toBe(encodeLine(' a=b', false));
    });

    it('throws a TypeError for anything but a string', () => {
        for (const value of [undefined, null, 5]) {
            expect(() => encodeLine(value as unknown as string)).toThrow(TypeError);
        }
        expect(encodeLine(new String('a b') as unknown as string, true)).toBe('a\\ b');
    });
});

describe('utils.LineReader', () => {
    const readAll = (str: string) => {
        const lr = new LineReader(str);
        const lines: string[] = [];
        for (let line = lr.readLine(); line !== undefined; line = lr.readLine()) lines.push(line);
        return lines;
    };

    it('exposes its state', () => {
        const lr = new LineReader('a=1\nb=2');
        expect(lr.str).toBe('a=1\nb=2');
        expect(lr.strLen).toBe(7);
        expect(lr.pos).toBe(0);
        expect(lr.readLine()).toBe('a=1');
        expect(lr.pos).toBe(4);
        expect(lr.readLine()).toBe('b=2');
        expect(lr.readLine()).toBe(undefined);
        expect(lr.readLine()).toBe(undefined);
    });

    it('reads logical lines', () => {
        expect(readAll('  a = 1 \r\n# c\n\n\tb\\\n   c\\\r\n  d\\\r e\n! c\\\nf')).toEqual(['a = 1 ', 'bcde', 'f']);
    });

    it('keeps escapes', () => {
        expect(readAll('a\\=\\u0041\\\\\nb')).toEqual(['a\\=\\u0041\\\\', 'b']);
    });
});

describe('utils.rawParseLine', () => {
    const split = (line: string) => {
        const res = rawParseLine(line);
        expect(res.line).toBe(line);
        return [line.substring(0, res.sepStart), line.substring(res.valueStart)];
    };

    it('finds key and value', () => {
        expect(split('key=value')).toEqual(['key', 'value']);
        expect(split('key : value')).toEqual(['key', 'value']);
        expect(split('key value')).toEqual(['key', 'value']);
        expect(split('key  =:value')).toEqual(['key', ':value']);
        expect(split('k\\=ey\\ \\:=value')).toEqual(['k\\=ey\\ \\:', 'value']);
        expect(split('key')).toEqual(['key', '']);
        expect(split('=value')).toEqual(['', 'value']);
        expect(split('')).toEqual(['', '']);
    });

    it('returns offsets', () => {
        expect(rawParseLine('ab = cd')).toEqual({line: 'ab = cd', sepStart: 2, valueStart: 5});
    });
});

describe('utils.rawParse', () => {
    it('calls consumeFn for each logical line', () => {
        const res: ParsedLine[] = [];
        rawParse('a=1\n# c\nb : 2\\\n  3\nc', (line) => res.push(line));
        expect(res).toEqual([
            {line: 'a=1', sepStart: 1, valueStart: 2},
            {line: 'b : 23', sepStart: 1, valueStart: 4},
            {line: 'c', sepStart: 1, valueStart: 1},
        ]);
    });
});
