import {afterEach, describe, expect, it, vi} from 'vitest';
import JavaProps, {parse, type Properties, stringify} from '../../src/java-props';
import {dateCases, stringifyCases} from '../cases/stringify-cases.mts';
import {fixtureFiles, readFixture, readFixtureResult, readStringifyExpected} from '../support/data.mts';

const fixtures = fixtureFiles();

describe('parse', () => {
    it('has fixtures', () => {
        expect(fixtures.length).toBeGreaterThan(0);
    });

    for (const file of fixtures) {
        it(`parses ${file}`, () => {
            expect(JavaProps.parse(readFixture(file))).toEqual(readFixtureResult(file));
        });
    }

    it('joins continuation lines ending with CRLF or CR', () => {
        expect(JavaProps.parse('abc=123\\\r\ndef=456')).toEqual({abc: '123def=456'});
        expect(JavaProps.parse('abc=123\\\rdef=456')).toEqual({abc: '123def=456'});
    });

    it('ignores a continuation backslash at the end (Java returns an empty key)', () => {
        expect(JavaProps.parse('\\')).toEqual({});
        expect(JavaProps.parse('key=value\\')).toEqual({key: 'value'});
    });

    it('ignores a trailing blank line or comment', () => {
        expect(JavaProps.parse('')).toEqual({});
        expect(JavaProps.parse('\n')).toEqual({});
        expect(JavaProps.parse('\n   ')).toEqual({});
        expect(JavaProps.parse('key=value\n')).toEqual({key: 'value'});
        expect(JavaProps.parse('key=value\n   ')).toEqual({key: 'value'});
        expect(JavaProps.parse('key=value\n# comment')).toEqual({key: 'value'});
    });

    it('returns a null-prototype object', () => {
        const props = JavaProps.parse('__proto__=a\nconstructor=b');
        expect(Object.getPrototypeOf(props)).toBe(null);
        expect(Object.keys(props)).toEqual(['__proto__', 'constructor']);
        expect(Object.getOwnPropertyDescriptor(props, '__proto__')?.value).toBe('a');
    });

    it('throws on malformed \\uXXXX', () => {
        expect(() => JavaProps.parse('k=\\u12')).toThrow(new Error('Malformed \\uxxxx encoding.'));
    });
});

describe('stringify', () => {
    const expectConvertBack = (props: Properties) => {
        expect(JavaProps.parse(JavaProps.stringify(props))).toEqual(props);
    };

    for (const file of fixtures) {
        it(`round-trips ${file}`, () => {
            expectConvertBack(JavaProps.parse(readFixture(file)));
        });
    }

    it('round-trips leading and trailing spaces', () => {
        expectConvertBack({' key': 'value'});
        expectConvertBack({key: ' value'});
        expectConvertBack({'key ': 'value'});
        expectConvertBack({key: 'value '});
        expectConvertBack({'  ke:y=  ': ' =  \\nval\\ue\n   '});
    });

    it('writes "key: value" lines', () => {
        expect(JavaProps.stringify({a: '1', b: '2'})).toBe('a: 1\nb: 2\n');
        expect(JavaProps.stringify({})).toBe('');
        expect(JavaProps.stringify({'': ''})).toBe(': \n');
    });

    it('skips inherited properties', () => {
        const proto = {inherited: 'x'};
        const obj = Object.create(proto);
        obj.key = 'value';
        expect(JavaProps.stringify(obj)).toBe('key: value\n');
    });

    it('accepts null-prototype objects', () => {
        const obj = Object.create(null);
        obj.key = 'value';
        expect(JavaProps.stringify(obj)).toBe('key: value\n');
    });
});

describe('stringify with javaVersion', () => {
    const expected = readStringifyExpected();
    const base = {javaVersion: 25, date: false, lineSeparator: '\n'} as const;

    for (const c of stringifyCases) {
        it(`writes like Properties.store(): ${c.name}`, () => {
            const options = {...base, comments: c.comments};
            expect(stringify(c.props, options)).toBe(expected.cases[c.name].writer);
            expect(stringify(c.props, {...options, escapeUnicode: true})).toBe(expected.cases[c.name].stream);
        });
    }

    for (const d of dateCases) {
        it(`writes the date like Java: ${d.name}`, () => {
            const options = {...base, date: new Date(d.time), timeZone: d.timeZone};
            expect(stringify({}, options)).toBe(`#${expected.dates[d.name].java}\n`);
        });
    }
});

describe('stringify options', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllEnvs();
    });

    // Replaces a property for the duration of `fn`
    const withProperty = (obj: object, name: string, value: unknown, fn: () => void) => {
        const descriptor = Object.getOwnPropertyDescriptor(obj, name) as PropertyDescriptor;
        Object.defineProperty(obj, name, {value, configurable: true});
        try {
            fn();
        } finally {
            Object.defineProperty(obj, name, descriptor);
        }
    };

    it('keep the historical format by default', () => {
        const props = {b: '1', a: ' x=y '};
        expect(stringify(props, {})).toBe(stringify(props));
        expect(stringify(props, {order: 'sorted', separator: ' = ', lineSeparator: '\r\n'})).toBe(
            'a = \\ x=y \r\nb = 1\r\n'
        );
        expect(stringify(props, {escapeValueSpecials: true, escapeUnicode: false})).toBe('b: 1\na: \\ x\\=y \n');
        expect(stringify(Object.create({inherited: 'x'}), {javaVersion: 25, date: false})).toBe('');
    });

    it('write a date string as a comment', () => {
        expect(stringify({}, {date: 'Mon\nTue'})).toBe('#Mon\n#Tue\n');
    });

    it('write the current date by default with javaVersion', () => {
        vi.useFakeTimers({now: Date.UTC(2026, 0, 15, 13, 4, 5)});
        const expected = '#Thu Jan 15 13:04:05 UTC 2026\nk=v\n';
        expect(stringify({k: 'v'}, {javaVersion: 25, timeZone: 'UTC', lineSeparator: '\n'})).toBe(expected);
        expect(stringify({k: 'v'}, {javaVersion: 25, timeZone: 'UTC', lineSeparator: '\n', date: ''})).toBe(expected);
    });

    it('use the system line separator with javaVersion', () => {
        withProperty(process, 'platform', 'win32', () => {
            expect(stringify({k: 'v'}, {javaVersion: 25, date: false})).toBe('k=v\r\n');
        });
        withProperty(process, 'platform', 'linux', () => {
            expect(stringify({k: 'v'}, {javaVersion: 25, date: false})).toBe('k=v\n');
        });
    });

    it('fall back to the GMT offset without Intl.DateTimeFormat#formatToParts', () => {
        vi.stubEnv('TZ', 'Etc/GMT-2');
        const date = new Date(Date.UTC(2026, 0, 15, 13, 4, 5));
        withProperty(Intl.DateTimeFormat.prototype, 'formatToParts', undefined, () => {
            expect(stringify({}, {date})).toBe('#Thu Jan 15 15:04:05 GMT+02:00 2026\n');
            expect(() => stringify({}, {date, timeZone: 'Europe/Paris'})).toThrow(RangeError);
        });
    });

    it('reject invalid options', () => {
        expect(() => stringify({k: 1 as unknown as string}, {javaVersion: 25})).toThrow(TypeError);
        expect(() => stringify({}, {javaVersion: 'nope'})).toThrow(RangeError);
        expect(() => stringify({}, {date: true, timeZone: 'Nowhere/Nope'})).toThrow(RangeError);
    });
});

describe('parse options', () => {
    it('reject an invalid javaVersion', () => {
        expect(() => parse('a=b', {javaVersion: 5})).toThrow(RangeError);
    });

    it('ignore an undefined javaVersion', () => {
        expect(parse('\\', {javaVersion: undefined})).toEqual(parse('\\'));
    });
});
