import {describe, expect, it} from 'vitest';
import JavaProps, {type Properties} from '../../src/java-props';
import {fixtureFiles, readFixture, readFixtureResult} from '../support/data.mts';

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
