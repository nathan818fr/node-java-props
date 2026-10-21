// Uses every public declaration. Compiled by TypeScript 2.9+ (check-types.mjs): keep it in TypeScript 2.9 syntax.
import javaProps = require('java-props');
import defaultProps from 'java-props';
import {parse, parseFile, stringify, Properties, ParseOptions, ParseFileOptions, StringifyOptions} from 'java-props';
import {readEntries, escapeKey, escapeValue, EntryReader, EntryPositions, EscapeOptions} from 'java-props';
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

// Options
const parseOptions: ParseOptions = {javaVersion: 8};
const fileOptions: ParseFileOptions = {javaVersion: '11.0.4', encoding: 'latin1'};
const stringifyOptions: StringifyOptions = {
    javaVersion: 'latest',
    separator: ' = ',
    escapeValueSpecials: true,
    escapeUnicode: false,
    comments: 'c',
    date: new Date(),
    timeZone: 'UTC',
    lineSeparator: '\r\n',
    order: 'sorted',
};
const escapeOptions: EscapeOptions = {javaVersion: 17, escapeUnicode: false};
const p4: Properties = parse('a=b', parseOptions) || javaProps.parse('a=b', {javaVersion: 17});
const s2: string =
    stringify(p4, stringifyOptions) + stringify(p4, {date: false}) + escapeKey('a', escapeOptions) + escapeValue('b');
const promises2: Array<Promise<Properties>> = [
    parseFile('file', 'latin1', parseOptions),
    parseFile('file', fileOptions),
    parseFile('file', {javaVersion: 8}),
    defaultProps.parseFile('file', fileOptions),
];

// readEntries
const reader: EntryReader = readEntries(s2, parseOptions);
while (reader.next()) {
    const entry: string = reader.key + reader.value + reader.rawKey + reader.rawValue + reader.line;
}
const positioned: EntryReader & EntryPositions = readEntries(s2, {javaVersion: 8, positions: true});
const position: number = positioned.start + positioned.end + positioned.startLine + positioned.startColumn;
