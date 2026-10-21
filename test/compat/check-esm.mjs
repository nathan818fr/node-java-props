// ESM consumers of the built package (dist/). Runs on Node.js >= 12.20 (named imports from CommonJS).
// Keep this file in Node 12 syntax (no top-level await).
import assert from 'assert';
import mainDefault, {
    escapeKey,
    escapeValue,
    parse,
    parseFile,
    readEntries,
    stringify,
} from '../../dist/node-java-props.js';
import browserDefault, * as browser from '../../dist/java-props.js';
import {decodeLine, encodeLine, LineReader, rawParse, rawParseLine, convertLine} from '../../dist/utils.js';

// `import x from` gives module.exports (CommonJS), whose `default` is the deprecated default export
assert.strictEqual(mainDefault.parse, parse);
assert.strictEqual(mainDefault.default.parseFile, parseFile);
assert.strictEqual(browserDefault.stringify, stringify);
assert.strictEqual(browser.parse, parse);
assert.strictEqual(convertLine, decodeLine);
for (const fn of [encodeLine, rawParse, rawParseLine]) assert.strictEqual(typeof fn, 'function');
assert.strictEqual(new LineReader('a=b').readLine(), 'a=b');

assert.deepStrictEqual(Object.assign({}, parse('a=1\nb : 2')), {a: '1', b: '2'});
assert.strictEqual(stringify({a: '1'}), 'a: 1\n');
assert.strictEqual(escapeKey('a b') + escapeValue(' c'), 'a\\ b\\ c');
const reader = readEntries('k=v', {javaVersion: 25});
assert.ok(reader.next() && reader.key === 'k' && reader.value === 'v');
parseFile(new URL('../fixtures/backslashes.properties', import.meta.url)).then(
    (props) => {
        assert.ok(Object.keys(props).length > 0);
        console.log(`OK: ESM imports work on Node.js ${process.version}`);
    },
    (err) => {
        console.error(err);
        process.exitCode = 1;
    }
);
