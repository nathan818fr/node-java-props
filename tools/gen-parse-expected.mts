// Generates test/cases/parse-expected.json: the result of each case of test/cases/parse-cases.mts with real JVMs
// (one key per era, see LOAD_ERAS in test/support/load-result.mts).
// Also checks the test/fixtures files against every JVM.
//
// Usage: node tools/gen-parse-expected.mts [--check]
//   JDKs: JAVA_REFERENCE_JDKS="name=/path/to/bin/java,..." (default: `java` from PATH). Eras without a JDK keep
//   their committed results.
//   --check: fail if the committed file is outdated, without writing it.
import fs from 'node:fs';
import path from 'node:path';
import cases from '../test/cases/parse-cases.mts';
import {
    fixtureFiles,
    PARSE_EXPECTED_FILE,
    readFixture,
    readFixtureResult,
    readParseExpected,
} from '../test/support/data.mts';
import {LOAD_ERAS, type LoadResult, sortedProps} from '../test/support/load-result.mts';
import {type Jdk, jvmLoad, listJdks, loadEra} from './java-reference/reference.mts';

const ROOT = path.join(import.meta.dirname, '..');
const check = process.argv.includes('--check');

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
let failed = false;
const fail = (msg: string) => {
    console.error(`ERROR: ${msg}`);
    failed = true;
};

// Run every JDK, grouped by era
const jdks = listJdks();
const byEra = new Map<string, {jdk: Jdk; results: LoadResult[]}[]>();
const inputs = cases.map((c) => c.input);
const fixtures = fixtureFiles();
const fixtureInputs = fixtures.map(readFixture);
for (const jdk of jdks) {
    const era = loadEra(jdk.version);
    console.log(`${jdk.name}: java.version=${jdk.version} -> era ${era}`);
    const results = jvmLoad(jdk, [...inputs, ...fixtureInputs]);
    if (!byEra.has(era)) byEra.set(era, []);
    byEra.get(era)?.push({jdk, results});
}

// Fixtures: every JVM must match the committed .expected.json
fixtures.forEach((file, i) => {
    const expected = {props: sortedProps(readFixtureResult(file))};
    for (const runs of byEra.values()) {
        for (const {jdk, results} of runs) {
            if (!same(results[inputs.length + i], expected)) fail(`fixture ${file}: ${jdk.name} result differs`);
        }
    }
});

// Cases
const previous: Record<string, Record<string, unknown>> = fs.existsSync(PARSE_EXPECTED_FILE) ? readParseExpected() : {};
const expected: Record<string, Record<string, unknown>> = {};
const names = new Set<string>();
cases.forEach((c, i) => {
    if (names.has(c.name)) fail(`duplicate case name: ${c.name}`);
    names.add(c.name);
    const entry: Record<string, unknown> = {input: c.input};
    for (const era of LOAD_ERAS) {
        const runs = byEra.get(era);
        if (!runs) {
            if (previous[c.name]?.[era]) entry[era] = previous[c.name][era];
            continue;
        }
        const [first, ...others] = runs;
        for (const other of others) {
            if (!same(first.results[i], other.results[i])) {
                fail(`${c.name}: ${first.jdk.name} and ${other.jdk.name} disagree (same era ${era}): new era?`);
            }
        }
        entry[era] = first.results[i];
    }
    expected[c.name] = entry;
});

for (const era of LOAD_ERAS)
    if (!byEra.has(era)) console.warn(`WARNING: no JDK for era ${era}, keeping committed results`);

const json = `${JSON.stringify(expected, null, 2)}\n`;
if (check) {
    if (fs.existsSync(PARSE_EXPECTED_FILE) && fs.readFileSync(PARSE_EXPECTED_FILE, 'utf8') === json) {
        console.log(`${path.relative(ROOT, PARSE_EXPECTED_FILE)} is up to date`);
    } else {
        fail(`${path.relative(ROOT, PARSE_EXPECTED_FILE)} is outdated: run "pnpm run reference:gen"`);
    }
} else {
    fs.writeFileSync(PARSE_EXPECTED_FILE, json);
    console.log(`written ${path.relative(ROOT, PARSE_EXPECTED_FILE)} (${cases.length} cases)`);
}
process.exit(failed ? 1 : 0);
