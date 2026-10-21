// Snapshot of the public API (export names and types): removing or retyping an export breaks users.
// The built dist/ is checked against the same snapshot by test/compat/run-smoke.js.
import {describe, expect, it} from 'vitest';
import CommonJavaProps, * as CommonJavaPropsNs from '../../src/java-props';
import NodeJavaProps, * as NodeJavaPropsNs from '../../src/node-java-props';
import * as Utils from '../../src/utils';

const shape = (mod: object) =>
    Object.entries(mod)
        .filter(([key]) => key !== '__esModule')
        .map(([key, value]) => `${key}: ${typeof value}`)
        .sort();

describe('exports', () => {
    it('match the API snapshot', async () => {
        const api = {
            main: shape(NodeJavaPropsNs),
            mainDefault: shape(NodeJavaProps),
            browser: shape(CommonJavaPropsNs),
            browserDefault: shape(CommonJavaProps),
            utils: shape(Utils),
            lineReader: Object.getOwnPropertyNames(Utils.LineReader.prototype).sort(),
        };
        await expect(`${JSON.stringify(api, null, 2)}\n`).toMatchFileSnapshot('../compat/api-snapshot.json');
    });

    it('share the same functions', () => {
        for (const mod of [CommonJavaProps, CommonJavaPropsNs, NodeJavaProps, NodeJavaPropsNs]) {
            expect(mod.parse).toBe(CommonJavaPropsNs.parse);
            expect(mod.stringify).toBe(CommonJavaPropsNs.stringify);
        }
        expect(NodeJavaProps.parseFile).toBe(NodeJavaPropsNs.parseFile);
    });
});
