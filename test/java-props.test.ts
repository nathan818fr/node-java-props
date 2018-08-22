import fs from 'fs';
import javaProps from '../src/java-props';
import {convertLine} from '../src/utils';

it('utility class can\'t be instantiated', () => {
    // @ts-ignore
    expect(() => new javaProps()).toThrow(Error);
});

describe('load', () => {
    it('validate test.properties', async () => {
        const res = JSON.parse(await fs.readFileSync(__dirname + '/test.properties-result.json', 'utf8'));
        const props = await javaProps.loadFile(__dirname + '/test.properties');
        expect(props).toEqual(res);
    });

    it('test escaped crlf', () => {
        expect(javaProps.loadString('abc=123\\\r\ndef=456')).toEqual({abc: '123def=456'});
    });

    it('test escaped eof', () => {
        expect(javaProps.loadString('\\')).toEqual({});
        expect(javaProps.loadString('key=value\\')).toEqual({key: 'value'});
    });

    it('test empty last line', () => {
        expect(javaProps.loadString('')).toEqual({});
        expect(javaProps.loadString('\n')).toEqual({});
        expect(javaProps.loadString('\n   ')).toEqual({});
        expect(javaProps.loadString('key=value\n')).toEqual({key: 'value'});
        expect(javaProps.loadString('key=value\n   ')).toEqual({key: 'value'});
        expect(javaProps.loadString('key=value\n# comment')).toEqual({key: 'value'});
    });

    it('must throw on read error', async () => {
        let err;
        try {
            await javaProps.loadFile(__dirname + '/nonexistent-file.properties');
        } catch (e) {
            err = e;
        }
        expect(err).toBeDefined();
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
