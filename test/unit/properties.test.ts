// Property-based tests (fast-check): random inputs, shrunk to a minimal one on failure.
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';
import {parse, stringify} from '../../src/java-props';
import {props, text} from '../support/arbitraries.mts';

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

    it('stringify output is parsed back to the same properties, with every javaVersion', () => {
        for (const javaVersion of [8, 9, '11.0.5', 13]) {
            fc.assert(
                fc.property(props, (p) => {
                    expect({...parse(stringify(p, {javaVersion}), {javaVersion})}).toEqual({...p});
                })
            );
        }
    });
});
