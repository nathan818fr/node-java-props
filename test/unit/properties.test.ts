// Property-based tests (fast-check): random inputs, shrunk to a minimal one on failure.
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';
import {parse, stringify} from '../../src/java-props';

// Pieces of .properties text that matter to the parser, and some that don't (backslash weighted)
const PIECES = [
    ...['\\', '\\', '\\', '\\u', '\\u00', '\\u0041', '\\\n', '\\\r\n'],
    ...['\n', '\r', '\r\n', '\n#', '\n!', ' ', '\t', '\f', '=', ':', '#', '!'],
    ...['a', 'k', 'v', 'u', '0', 'F', 'g', 'n', 't', 'é'],
    ...['\u0000', '\u007F', '\u00A0', '\uFEFF', '\uD83D', '\uDC51'],
];
const text = (maxPieces: number) =>
    fc.array(fc.constantFrom(...PIECES), {maxLength: maxPieces}).map((pieces) => pieces.join(''));

describe('properties', () => {
    it('parse only throws on malformed \\uXXXX', () => {
        fc.assert(
            fc.property(text(24), (input) => {
                try {
                    parse(input);
                } catch (err) {
                    expect((err as Error).message).toBe('Malformed \\uxxxx encoding.');
                }
            })
        );
    });

    it('stringify output is parsed back to the same properties', () => {
        fc.assert(
            fc.property(fc.dictionary(text(8), text(8)), (props) => {
                expect({...parse(stringify(props))}).toEqual({...props});
            })
        );
    });
});
