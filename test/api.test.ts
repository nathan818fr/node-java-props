/*
 * Definitions
 */

const apis: any = {};

// common
import CommonJavaProps from '../src/java-props';
import * as CommonJavaPropsW from '../src/java-props';

const CommonJavaPropsR = require('../src/java-props');

apis.common = {
    modules: [CommonJavaProps, CommonJavaPropsW, CommonJavaPropsR],
    methods: ['parse', 'stringify'],
};

// node
import NodeJavaProps from '../src/node-java-props';
import * as NodeJavaPropsW from '../src/node-java-props';

const NodeJavaPropsR = require('../src/node-java-props');

apis.node = {
    parent: apis.common,
    modules: [NodeJavaProps, NodeJavaPropsW, NodeJavaPropsR],
    methods: ['parseFile'],
};

/*
 * Tests
 */

const testExport = (method: string, modules: any[], _first?: any) => {
    let first = _first;
    it('export ' + method, () => {
        for (const module of modules) {
            expect(module[method]).toBeDefined();
            if (first !== undefined) {
                expect(module[method]).toBe(first);
            } else {
                first = module[method];
            }
        }
    });
};

for (const apiName in apis) {
    if (!apis.hasOwnProperty(apiName)) {
        continue;
    }
    const api = apis[apiName];

    describe(apiName + ' api', () => {
        if (api.parent) {
            for (const method of api.parent.methods) {
                testExport(method, api.modules, api.parent.modules[0][method]);
            }
        }
        for (const method of api.methods) {
            testExport(method, api.modules);
        }
    });
}
