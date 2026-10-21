// Uses every public declaration. Compiled by TypeScript 2.9+ (check-types.mjs): keep it in TypeScript 2.9 syntax.
import javaProps = require('java-props');
import defaultProps from 'java-props';
import {parse, parseFile, stringify, Properties} from 'java-props';
import * as browser from 'java-props/dist/java-props';
import browserDefault from 'java-props/dist/java-props';
import {
    LineReader,
    ParsedLine,
    rawParse,
    rawParseLine,
    decodeLine,
    encodeLine,
    convertLine,
} from 'java-props/dist/utils';

const p1: Properties = javaProps.parse('a=b');
const p2: Properties = parse('a=b');
const s: string = stringify(p1) + javaProps.stringify(p2) + browser.stringify(p2) + browserDefault.stringify(p2);
const p3: Properties = defaultProps.parse(s) || browser.parse(s) || browserDefault.parse(s);
const value: string = p3['a'];

const promises: Array<Promise<Properties>> = [
    parseFile('file'),
    parseFile('file', 'latin1'),
    parseFile(Buffer.from('file')),
    parseFile(new URL('file:///file')),
    parseFile(3),
    javaProps.parseFile('file'),
    defaultProps.parseFile('file'),
];

const lr = new LineReader('a=b');
const line: string | undefined = lr.readLine();
const pos: number = lr.pos + lr.strLen;
const str: string = lr.str;
rawParse(s, (res: ParsedLine) => {
    const n: number = res.sepStart + res.valueStart;
    const l: string = res.line;
});
const parsed: ParsedLine = rawParseLine('a=b');
const decoded: string = decodeLine('a') + encodeLine('a') + encodeLine('a', true) + convertLine('a');
