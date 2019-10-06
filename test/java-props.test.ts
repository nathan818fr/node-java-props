import fs from 'fs';
import JavaProps from '../src/java-props';
import {decodeLine, encodeLine} from '../src/utils';

describe('parse', () => {
    it('validate test.properties', async () => {
        const res = JSON.parse(fs.readFileSync(__dirname + '/test.properties-result.json', 'utf8'));
        const props = JavaProps.parse(fs.readFileSync(__dirname + '/test.properties', 'utf8'));
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

describe('stringify', () => {
    const expectConvertBack = (props: any) => {
        const newProps = JavaProps.parse(JavaProps.stringify(props));
        expect(newProps).toEqual(props);
    };

    it('convert back test.properties', async () => {
        expectConvertBack(JavaProps.parse(fs.readFileSync(__dirname + '/test.properties', 'utf8')));
    });

    it('must handle spacings', async () => {
        expectConvertBack({' key': 'value'});
        expectConvertBack({'key': ' value'});
        expectConvertBack({'key ': 'value'});
        expectConvertBack({'key': 'value '});
        expectConvertBack({'  ke:y=  ': ' =  \\nval\\ue\n   '});
    });

    it('must skip non-own properties', async () => {
        const obj = {'key': 'value'};
        (Object.prototype as any).notAKey = 'x';
        expect(JavaProps.stringify(obj)).toBe('key: value\n');
    });

    it('must handle null-prototype objects', async () => {
        const obj = Object.create(null);
        obj.key = 'value';
        expect(JavaProps.stringify(obj)).toBe('key: value\n');
    });
});

const converts: any = {
    t: '\t',
    r: '\r',
    n: '\n',
    f: '\f',
};

describe('utils.decodeLine', () => {
    for (const char in converts) {
        if (converts.hasOwnProperty(char)) {
            const repl = converts[char];
            it('must decode \\' + char, () => {
                expect(decodeLine('abc\\' + char + 'def\\' + char + 'ghi')).toBe('abc' + repl + 'def' + repl + 'ghi');
            });
        }
    }

    it('must remove useless escapes', () => {
        expect(decodeLine('a\\bc\\def\\\\')).toBe('abcdef\\');
    });

    it('must replace \\uxxxx', () => {
        expect(decodeLine('\\u0058 \\u2764')).toBe('X ❤');
        expect(decodeLine('\\u00580')).toBe('X0');
        expect(decodeLine('\\u0058A\\u2764Test')).toBe('XA❤Test');
        expect(decodeLine('\\u002F \\u002f')).toBe('/ /');
    });

    it('must throw on malformed \\uxxxx', () => {
        expect(() => decodeLine('\\u')).toThrow();
        expect(() => decodeLine('\\u58')).toThrow();
        expect(() => decodeLine('\\u27g4')).toThrow();
    });

    it('must not replace escaped', () => {
        expect(decodeLine('test\\nand\\\\n \\\\\\n')).toBe('test\nand\\n \\\n');
        expect(decodeLine('abc \\\\u0000')).toBe('abc \\u0000');
        expect(decodeLine('abc \\\\uxxxx')).toBe('abc \\uxxxx');
    });
});

const origEncodeLine = encodeLine;
for (const isKey of [false, true]) {
    const encodeLine = (line: string) => origEncodeLine(line, isKey);
    describe('utils.encodeLine (isKey=' + isKey + ')', () => {
        for (const char in converts) {
            if (converts.hasOwnProperty(char)) {
                const repl = converts[char];
                it('must encode \\' + char, () => {
                    expect(encodeLine('abc' + repl + 'def' + repl + 'ghi')).toBe('abc\\' + char + 'def\\' + char + 'ghi');
                });
            }
        }

        it('must escape special chars', () => {
            expect(encodeLine('!# :=\\')).toBe(isKey ? '\\!\\#\\ \\:\\=\\\\' : '!# :=\\\\');
        });

        if (!isKey) {
            it('must escape beginning space', () => {
                expect(encodeLine('  abc def ghi jkl ')).toBe('\\  abc def ghi jkl ');
            });
        }

        it('must not escape normal chars', () => {
            let str = '';
            for (let cc = 33; cc < 127; ++cc) {
                const c = String.fromCharCode(cc);
                if (c === '\\' || (isKey && (c === '!' || c === '#' || c === ' ' || c === ':' || c === '='))) {
                    continue;
                }
                str += c;
            }
            expect(encodeLine(str)).toBe(str);
        });

        it('must encode others unicode chars', () => {
            expect(encodeLine('\0')).toBe('\\u0000');
            expect(encodeLine('\u0014')).toBe('\\u0014');
            expect(encodeLine('\u007F')).toBe('\\u007F');
            expect(encodeLine('é')).toBe('\\u00E9');
            expect(encodeLine('👑')).toBe('\\uD83D\\uDC51');
            expect(encodeLine(String.fromCharCode(15))).toBe('\\u000F');
            expect(encodeLine(String.fromCharCode(255))).toBe('\\u00FF');
            expect(encodeLine(String.fromCharCode(4095))).toBe('\\u0FFF');
            expect(encodeLine(String.fromCharCode(65535))).toBe('\\uFFFF');
        });
    });
}
