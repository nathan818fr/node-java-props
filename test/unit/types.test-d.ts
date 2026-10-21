// Public types (vitest --typecheck). Compatibility with old TypeScript versions: test/compat/check-types.mjs.
import {describe, expectTypeOf, it} from 'vitest';
import javaProps, {type Properties, parse, parseFile, stringify} from '../../src/node-java-props';
import {
    convertLine,
    decodeLine,
    encodeLine,
    LineReader,
    type ParsedLine,
    rawParse,
    rawParseLine,
} from '../../src/utils';

describe('types', () => {
    it('main', () => {
        expectTypeOf<Properties>().toEqualTypeOf<{[key: string]: string}>();
        expectTypeOf(parse).toEqualTypeOf<(str: string) => Properties>();
        expectTypeOf(stringify).toEqualTypeOf<(props: Properties) => string>();
        expectTypeOf(parseFile).toEqualTypeOf<
            (path: string | Buffer | URL | number, encoding?: string) => Promise<Properties>
        >();
        expectTypeOf(javaProps).toEqualTypeOf<{
            parse: typeof parse;
            parseFile: typeof parseFile;
            stringify: typeof stringify;
        }>();
    });

    it('utils', () => {
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
