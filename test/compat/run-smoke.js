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

// Edge cases with javaVersion: same results as Java (test/unit/parse-cases.test.ts)
const ERA_VERSIONS = {jdk8: 8, jdk9: 9, jdk11: '11.0.5', jdk13: 13};
const javaCases = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/cases/parse-expected.json'), 'utf8'));
Object.keys(ERA_VERSIONS).forEach((era) => {
    check('cases with javaVersion ' + ERA_VERSIONS[era], () => {
        Object.keys(javaCases).forEach((name) => {
            const c = javaCases[name];
            let res;
            try {
                res = {props: sortedEntries(main.parse(c.input, {javaVersion: ERA_VERSIONS[era]}))};
            } catch (err) {
                res = {throws: err.message};
            }
            const java = c[era];
            assert.deepStrictEqual(
                res,
                java.throws ? {throws: java.message} : {props: sortedEntries(java.props)},
                name
            );
        });
    });
});

// stringify with javaVersion: same output as Java (test/unit/java-props.test.ts)
const storeCases = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/cases/stringify-expected.json'), 'utf8'));
check('stringify with javaVersion', () => {
    Object.keys(storeCases.cases).forEach((name) => {
        const c = storeCases.cases[name];
        const options = {javaVersion: 25, comments: c.comments, date: false, lineSeparator: '\n'};
        assert.strictEqual(main.stringify(c.props, options), c.writer, name);
        options.escapeUnicode = true;
        assert.strictEqual(main.stringify(c.props, options), c.stream, name);
    });
    // Exact time zones only: names of the others depend on the Intl support of each Node.js version
    Object.keys(storeCases.dates).forEach((name) => {
        const d = storeCases.dates[name];
        if (d.timeZone !== 'UTC' && !/^[+-]/.test(d.timeZone)) return;
        const options = {javaVersion: 25, date: new Date(d.time), timeZone: d.timeZone, lineSeparator: '\n'};
        assert.strictEqual(main.stringify({}, options), '#' + d.java + '\n', name);
    });
});

// readEntries and escapeKey/escapeValue
check('readEntries', () => {
    const reader = main.readEntries('# c\nb=\\u00e9\r\na : 1\\\n  2', {positions: true});
    const entries = [];
    while (reader.next()) {
        entries.push([
            reader.key,
            reader.value,
            reader.rawValue,
            reader.start,
            reader.end,
            reader.startLine,
            reader.startColumn,
        ]);
    }
    assert.deepStrictEqual(entries, [
        ['b', '\u00e9', '\\u00e9', 4, 12, 2, 1],
        ['a', '12', '12', 14, 24, 3, 1],
    ]);
    assert.strictEqual(browser.readEntries, main.readEntries);
    assert.strictEqual(main.escapeKey('k =é'), 'k\\ \\=\\u00E9');
    assert.strictEqual(main.escapeValue(' v=é', {javaVersion: 17}), '\\ v\\=é');
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
