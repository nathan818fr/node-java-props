import fc from 'fast-check';
import {describe, expect, it} from 'vitest';
import {escapeKey, escapeValue, readEntries} from '../../src/java-props';
import {decodeLine, encodeLine, rawParse} from '../../src/utils';
import {text} from '../support/arbitraries.mts';

const entries = (str: string, javaVersion?: number) => {
    const res: string[][] = [];
    const reader = readEntries(str, {javaVersion});
    while (reader.next()) res.push([reader.rawKey, reader.rawValue, reader.key, reader.value]);
    return res;
};

describe('readEntries', () => {
    it('reads entries in order, duplicates included', () => {
        expect(entries('b=1\n# c\na : 2\\\n  3\nb=\\u00e9')).toEqual([
            ['b', '1', 'b', '1'],
            ['a', '23', 'a', '23'],
            ['b', '\\u00e9', 'b', 'é'],
        ]);
    });

    it('gives the logical line', () => {
        const reader = readEntries('k = a\\\n   b');
        expect(reader.next()).toBe(true);
        expect(reader.line).toBe('k = ab');
        expect(reader.next()).toBe(false);
    });

    it('has no entry before next() and at the end', () => {
        const reader = readEntries('k=v', {positions: true});
        expect([reader.line, reader.rawKey, reader.key, reader.value, reader.start, reader.startLine]).toEqual(
            Array(6).fill(undefined)
        );
        reader.next();
        reader.next();
        expect([reader.line, reader.rawKey, reader.rawValue, reader.key, reader.end, reader.startColumn]).toEqual(
            Array(6).fill(undefined)
        );
    });

    it('decodes only on access', () => {
        const reader = readEntries('k=\\u12\nk2=v');
        expect(reader.next()).toBe(true);
        expect(reader.rawValue).toBe('\\u12');
        expect(() => reader.value).toThrow('Malformed \\uxxxx encoding.');
        expect(reader.next()).toBe(true);
        expect(reader.value).toBe('v');
    });

    it('decodes like Java, leftovers of its line buffer included (see parse-cases.mts)', () => {
        // Java 8 to 12 read the "12" left by the first line, Java 13+ throws
        const reader = readEntries('abcdef12\na=\\u00', {javaVersion: 8});
        reader.next();
        reader.next();
        expect(reader.value).toBe('\u0012');
        const reader13 = readEntries('abcdef12\na=\\u00', {javaVersion: 13});
        reader13.next();
        reader13.next();
        expect(() => reader13.value).toThrow('Malformed \\uxxxx encoding.');
        // Java 8 reads the comment's leftover "\\", Java 9 a never written '\0'
        expect(entries('#a\\\n\\', 8)).toEqual([['\\', '', '\\', '']]);
        expect(entries('#a\\\n\\', 9)).toEqual([['\\', '', '\0', '']]);
    });

    it('rejects an invalid javaVersion', () => {
        expect(() => readEntries('', {javaVersion: 'x'})).toThrow(RangeError);
    });

    it('reads like the deprecated utils without javaVersion', () => {
        const outcome = (fn: () => string[][]) => {
            try {
                return fn();
            } catch (err) {
                return (err as Error).message;
            }
        };
        fc.assert(
            fc.property(text(30), (input) => {
                const deprecated = () => {
                    const res: string[][] = [];
                    rawParse(input, ({line, sepStart, valueStart}) => {
                        const [rawKey, rawValue] = [line.substring(0, sepStart), line.substring(valueStart)];
                        res.push([rawKey, rawValue, decodeLine(rawKey), decodeLine(rawValue)]);
                    });
                    return res;
                };
                expect(outcome(() => entries(input))).toEqual(outcome(deprecated));
            })
        );
    });
});

describe('readEntries positions', () => {
    const positions = (str: string, javaVersion?: number | string) => {
        const res: number[][] = [];
        const reader = readEntries(str, {javaVersion, positions: true});
        while (reader.next()) res.push([reader.start, reader.end, reader.startLine, reader.startColumn]);
        return res;
    };

    it('give the range, line and column of each entry', () => {
        const input = '# c\r\n  a=1\r\nb = 2\\\r\n   3\n\n\tc\rd';
        const expected = [
            [7, 10, 2, 3],
            [12, 24, 3, 1],
            [27, 28, 6, 2],
            [29, 30, 7, 1],
        ];
        for (const javaVersion of [undefined, 8, 9, '11.0.5', 13]) {
            expect(positions(input, javaVersion), String(javaVersion)).toEqual(expected);
        }
    });

    it('start an entry at its first char, after an empty continuation line', () => {
        for (const javaVersion of [undefined, 8, 13]) {
            expect(positions('\\\nk=v', javaVersion)).toEqual([[2, 5, 2, 1]]);
        }
    });

    it('start an empty entry at its continuation backslash (Java only)', () => {
        expect(positions('a=1\n  \\', 8)).toEqual([
            [0, 3, 1, 1],
            [6, 7, 2, 3],
        ]);
        expect(positions('a=1\n  \\')).toEqual([[0, 3, 1, 1]]);
    });

    it('skip comments, even those written to Java 8 line buffer', () => {
        for (const javaVersion of [undefined, 8, 9, 13]) {
            expect(positions('#ab\\c\nk=v', javaVersion)).toEqual([[6, 9, 2, 1]]);
        }
    });

    it('are consistent with the line', () => {
        fc.assert(
            fc.property(text(30), fc.constantFrom(undefined, 8, 9, '11.0.5', 13), (input, javaVersion) => {
                const reader = readEntries(input, {javaVersion, positions: true});
                let previousEnd = -1;
                while (reader.next()) {
                    const {start, end, line} = reader;
                    expect(start).toBeGreaterThan(previousEnd);
                    expect(end).toBeGreaterThan(start);
                    expect(end).toBeLessThanOrEqual(input.length);
                    if (line !== '') expect(input[start]).toBe(line[0]);
                    // startLine/startColumn: like a naive count
                    const before = input.substring(0, start).split(/\r\n|\r|\n/);
                    expect([reader.startLine, reader.startColumn]).toEqual([
                        before.length,
                        before[before.length - 1].length + 1,
                    ]);
                    previousEnd = end;
                }
            })
        );
    });
});

describe('escapeKey / escapeValue', () => {
    it('escape like the deprecated encodeLine by default', () => {
        fc.assert(
            fc.property(text(8), (s) => {
                expect(escapeKey(s)).toBe(encodeLine(s, true));
                expect(escapeValue(s)).toBe(encodeLine(s));
            })
        );
    });

    it('escape like Properties.store() with javaVersion', () => {
        expect(escapeKey('a=b é', {javaVersion: 17})).toBe('a\\=b\\ é');
        expect(escapeValue(' a=b é', {javaVersion: 17})).toBe('\\ a\\=b é');
        expect(escapeValue(' a=b é', {javaVersion: 17, escapeUnicode: true, escapeValueSpecials: false})).toBe(
            '\\ a=b \\u00E9'
        );
    });

    it('reject invalid arguments', () => {
        expect(() => escapeKey(1 as unknown as string)).toThrow(TypeError);
        expect(() => escapeValue('', {javaVersion: 'x'})).toThrow(RangeError);
    });
});
