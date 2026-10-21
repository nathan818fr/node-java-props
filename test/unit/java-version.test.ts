import {describe, expect, it} from 'vitest';
import {type LoadEra, loadEra} from '../../src/internal/java-version';

describe('loadEra', () => {
    it('maps Java versions to load eras', () => {
        const eras: [number | string, LoadEra][] = [
            [6, 'jdk8'],
            ['1.6.0_45', 'jdk8'],
            [8, 'jdk8'],
            ['1.8.0_392', 'jdk8'],
            [9, 'jdk9'],
            ['9.0.7.1', 'jdk9'],
            ['10.0.2', 'jdk9'],
            ['11.0.4', 'jdk9'],
            [11, 'jdk11'],
            ['11', 'jdk11'],
            ['11.0', 'jdk11'],
            ['11.0.5', 'jdk11'],
            ['11.0.32.1', 'jdk11'],
            [12, 'jdk9'],
            [13, 'jdk13'],
            ['17-ea', 'jdk13'],
            ['21.0.2+13-LTS', 'jdk13'],
            [99, 'jdk13'],
            ['latest', 'jdk13'],
        ];
        for (const [version, era] of eras) expect(loadEra(version), String(version)).toBe(era);
    });

    it('rejects invalid versions', () => {
        for (const version of [null, true, {}]) {
            expect(() => loadEra(version as unknown as number)).toThrow(TypeError);
        }
        for (const version of [5, 8.5, Number.NaN, '', 'abc', '1', '1.5.0', '5', '8.x', ' 8']) {
            expect(() => loadEra(version), String(version)).toThrow(RangeError);
        }
    });
});
