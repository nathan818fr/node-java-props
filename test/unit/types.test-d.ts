// Public types (vitest --typecheck). Compatibility with old TypeScript versions: test/compat/check-types.mjs.
import {describe, expectTypeOf, it} from 'vitest';
import javaProps, {
    type EntryPositions,
    type EntryReader,
    type EscapeOptions,
    escapeKey,
    escapeValue,
    type ParseFileOptions,
    type ParseOptions,
    type Properties,
    parse,
    parseFile,
    type ReadEntriesOptions,
    readEntries,
    type StringifyOptions,
    stringify,
} from '../../src/node-java-props';
import {
    convertLine,
    decodeLine,
    encodeLine,
    LineReader,
    type ParsedLine,
    rawParse,
    rawParseLine,
} from '../../src/utils';

type Path = string | Buffer | URL | number;

describe('types', () => {
    it('main', () => {
        expectTypeOf<Properties>().toEqualTypeOf<{[key: string]: string}>();
        expectTypeOf<ParseOptions>().toEqualTypeOf<{javaVersion?: number | string}>();
        expectTypeOf<ParseFileOptions>().toEqualTypeOf<{javaVersion?: number | string; encoding?: string}>();
        expectTypeOf(parse).toEqualTypeOf<(str: string, options?: ParseOptions) => Properties>();
        expectTypeOf(stringify).toEqualTypeOf<(props: Properties, options?: StringifyOptions) => string>();
        expectTypeOf(parseFile).toEqualTypeOf<{
            (path: Path, encoding?: string, options?: ParseOptions): Promise<Properties>;
            (path: Path, options?: ParseFileOptions): Promise<Properties>;
        }>();
        expectTypeOf(javaProps).toEqualTypeOf<{
            parse: typeof parse;
            parseFile: typeof parseFile;
            stringify: typeof stringify;
        }>();
    });

    it('readEntries', () => {
        expectTypeOf<ReadEntriesOptions>().toEqualTypeOf<{javaVersion?: number | string; positions?: boolean}>();
        expectTypeOf<EntryReader>().toEqualTypeOf<{
            next(): boolean;
            readonly line: string;
            readonly rawKey: string;
            readonly rawValue: string;
            readonly key: string;
            readonly value: string;
        }>();
        expectTypeOf<EntryPositions>().toEqualTypeOf<{
            readonly start: number;
            readonly end: number;
            readonly startLine: number;
            readonly startColumn: number;
        }>();
        expectTypeOf(readEntries('')).toEqualTypeOf<EntryReader>();
        expectTypeOf(readEntries('', {javaVersion: 8})).toEqualTypeOf<EntryReader>();
        expectTypeOf(readEntries('', {positions: true})).toEqualTypeOf<EntryReader & EntryPositions>();
    });

    it('escape and stringify options', () => {
        expectTypeOf<EscapeOptions>().toEqualTypeOf<{
            javaVersion?: number | string;
            escapeValueSpecials?: boolean;
            escapeUnicode?: boolean;
        }>();
        expectTypeOf(escapeKey).toEqualTypeOf<(key: string, options?: EscapeOptions) => string>();
        expectTypeOf(escapeValue).toEqualTypeOf<(value: string, options?: EscapeOptions) => string>();
        expectTypeOf<StringifyOptions>().toEqualTypeOf<{
            javaVersion?: number | string;
            separator?: '=' | ':' | ' ' | ': ' | ' = ';
            escapeValueSpecials?: boolean;
            escapeUnicode?: boolean;
            comments?: string;
            date?: boolean | Date | string;
            timeZone?: string;
            lineSeparator?: '\n' | '\r\n' | '\r';
            order?: 'insertion' | 'sorted';
        }>();
    });

    it('utils (deprecated: the 2.3.1 declarations, with a fixed readLine)', () => {
        expectTypeOf<ParsedLine>().toEqualTypeOf<{line: string; sepStart: number; valueStart: number}>();
        expectTypeOf(rawParse).toEqualTypeOf<(str: string, consumeFn: (res: ParsedLine) => void) => void>();
        expectTypeOf(rawParseLine).toEqualTypeOf<(line: string) => ParsedLine>();
        expectTypeOf(decodeLine).toEqualTypeOf<(line: string) => string>();
        expectTypeOf(convertLine).toEqualTypeOf(decodeLine);
        expectTypeOf(encodeLine).toEqualTypeOf<(line: string, isKey?: boolean) => string>();
        expectTypeOf(LineReader).constructorParameters.toEqualTypeOf<[str: string]>();
        expectTypeOf<LineReader['readLine']>().toEqualTypeOf<() => string | undefined>();
        expectTypeOf<Pick<LineReader, 'str' | 'strLen' | 'pos'>>().toEqualTypeOf<{
            readonly str: string;
            readonly strLen: number;
            pos: number;
        }>();
    });
});
