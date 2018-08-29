import fs from 'fs';
import {promisify} from 'util';
import JavaProps from '../src/java-props';
import {convertLine} from '../src/utils';

const readFile = promisify(fs.readFile);

describe('parse', () => {
    it('validate test.properties', async () => {
        const res = JSON.parse(await readFile(__dirname + '/test.properties-result.json', 'utf8'));
        const props = await JavaProps.parse(await readFile(__dirname + '/test.properties', 'utf8'));
        expect(props).toEqual(res);
    });

    it('must escape crlf', () => {
        expect(JavaProps.parse('abc=123\\\r\ndef=456')).toEqual({abc: '123def=456'});
        expect(JavaProps.parse('abc=123\\\rdef=456')).toEqual({abc: '123def=456'});
    });

    it('must ignore escaped eof', () => {
        expect(JavaProps.parse('\\')).toEqual({});
        expect(JavaProps.parse('key=value\\')).toEqual({key: 'value'});
    });

    it('must ignore empty last line', () => {
        expect(JavaProps.parse('')).toEqual({});
        expect(JavaProps.parse('\n')).toEqual({});
        expect(JavaProps.parse('\n   ')).toEqual({});
        expect(JavaProps.parse('key=value\n')).toEqual({key: 'value'});
        expect(JavaProps.parse('key=value\n   ')).toEqual({key: 'value'});
        expect(JavaProps.parse('key=value\n# comment')).toEqual({key: 'value'});
    });
});

describe('utils.convertLine', () => {
    const converts: any = {
        t: '\t',
        r: '\r',
        n: '\n',
        f: '\f',
    };
    for (const char in converts) {
        if (converts.hasOwnProperty(char)) {
            const repl = converts[char];
            it('must convert \\' + char, () => {
                expect(convertLine('abc\\' + char + 'def\\' + char + 'ghi')).toBe('abc' + repl + 'def' + repl + 'ghi');
            });
        }
    }

    it('must remove useless escapes', () => {
        expect(convertLine('a\\bc\\def\\\\')).toBe('abcdef\\');
    });

    it('must replace \\uxxxx', () => {
        expect(convertLine('\\u0058 \\u2764')).toBe('X ❤');
        expect(convertLine('\\u00580')).toBe('X0');
        expect(convertLine('\\u0058A\\u2764Test')).toBe('XA❤Test');
        expect(convertLine('\\u002F \\u002f')).toBe('/ /');
    });

    it('must throw on malformed \\uxxxx', () => {
        expect(() => convertLine('\\u')).toThrow();
        expect(() => convertLine('\\u58')).toThrow();
        expect(() => convertLine('\\u27g4')).toThrow();
    });

    it('must not replace escaped', () => {
        expect(convertLine('test\\nand\\\\n \\\\\\n')).toBe('test\nand\\n \\\n');
        expect(convertLine('abc \\\\u0000')).toBe('abc \\u0000');
        expect(convertLine('abc \\\\uxxxx')).toBe('abc \\uxxxx');
    });
});
