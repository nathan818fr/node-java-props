// Smoke test of the built package (dist/). Runs on every supported Node.js version (>= 6), so: Node 6 syntax (no
// async/await, object spread, Object.entries/values, optional catch binding or trailing commas in calls), and no
// import of test/support (hence its own copies of a few helpers).

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const FIXTURES_DIR = path.join(ROOT, 'test/fixtures');

const main = require(ROOT); // package.json "main"
const browser = require(path.join(ROOT, require(path.join(ROOT, 'package.json')).browser));
const utils = require(path.join(ROOT, 'dist/utils'));

let count = 0;
function check(name, fn) {
    try {
        fn();
        count++;
    } catch (err) {
        console.error('FAILED: ' + name);
        throw err;
    }
}

function sortedEntries(obj) {
    return Object.keys(obj)
        .sort()
        .map((key) => [key, obj[key]]);
}

// API: same as the snapshot of the sources (test/unit/api.test.ts)
function shape(mod) {
    return Object.keys(mod)
        .filter((key) => key !== '__esModule')
        .map((key) => key + ': ' + typeof mod[key])
        .sort();
}
const api = JSON.parse(fs.readFileSync(path.join(__dirname, 'api-snapshot.json'), 'utf8'));
check('API shape', () => {
    assert.deepStrictEqual(
        {
            main: shape(main),
            mainDefault: shape(main.default),
            browser: shape(browser),
            browserDefault: shape(browser.default),
            utils: shape(utils),
            lineReader: Object.getOwnPropertyNames(utils.LineReader.prototype).sort(),
        },
        api
    );
    assert.strictEqual(main.parse, browser.parse);
    assert.strictEqual(main.stringify, browser.stringify);
    assert.strictEqual(main.default.parse, main.parse);
    assert.strictEqual(main.default.parseFile, main.parseFile);
    assert.strictEqual(browser.default.stringify, browser.stringify);
    assert.strictEqual(utils.convertLine, utils.decodeLine);
});

// Fixtures
fs.readdirSync(FIXTURES_DIR)
    .filter((file) => /\.properties$/.test(file))
    .forEach((file) => {
        check('fixture ' + file, () => {
            const input = fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8');
            const expected = JSON.parse(
                fs.readFileSync(
                    path.join(FIXTURES_DIR, file.replace(/(\.crlf)?\.properties$/, '.expected.json')),
                    'utf8'
                )
            );
            const props = main.parse(input);
            assert.deepStrictEqual(sortedEntries(props), sortedEntries(expected));
            assert.deepStrictEqual(sortedEntries(main.parse(main.stringify(props))), sortedEntries(expected));
        });
    });

// Edge cases: same results as the sources (test/unit/parse-cases.test.ts)
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/cases/parse-snapshot.json'), 'utf8'));
Object.keys(cases).forEach((name) => {
    check('case ' + name, () => {
        const c = cases[name];
        let res;
        try {
            res = {props: sortedEntries(main.parse(c.input))};
        } catch (err) {
            res = {throws: err.message};
        }
        assert.deepStrictEqual(res, c.throws ? {throws: c.message} : {props: sortedEntries(c.props)});
    });
});

// stringify
check('stringify', () => {
    assert.strictEqual(main.stringify({a: 'b c', ' k=': ' é\n'}), 'a: b c\n\\ k\\=: \\ \\u00E9\\n\n');
    const nullProto = Object.create(null);
    nullProto.k = 'v';
    assert.strictEqual(main.stringify(nullProto), 'k: v\n');
});

// parseFile
const file = path.join(FIXTURES_DIR, 'syntax.properties');
const expected = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'syntax.expected.json'), 'utf8'));
main.parseFile(file)
    .then((props) => {
        check('parseFile', () => {
            assert.deepStrictEqual(sortedEntries(props), sortedEntries(expected));
        });
        return main.parseFile(file, 'utf8');
    })
    .then((props) => {
        check('parseFile with encoding', () => {
            assert.deepStrictEqual(sortedEntries(props), sortedEntries(expected));
        });
        return main.parseFile(path.join(FIXTURES_DIR, 'nonexistent.properties')).then(
            () => {
                throw new Error('parseFile must reject');
            },
            (err) => {
                check('parseFile rejection', () => {
                    assert.strictEqual(err.code, 'ENOENT');
                });
            }
        );
    })
    .then(() => {
        console.log('OK: ' + count + ' checks passed on Node.js ' + process.version);
    })
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    });
