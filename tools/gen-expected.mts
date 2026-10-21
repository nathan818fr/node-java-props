// Generates the Java results of the test cases, by running real JVMs:
// - test/cases/parse-expected.json: Properties.load() for each case of parse-cases.mts (one key per era, see LOAD_ERAS
//   in src/internal/java-version.ts);
// - test/cases/stringify-expected.json: Properties.store() (Java 18+, without the date line) and Date.toString() for
//   the cases of stringify-cases.mts.
// Also checks the test/fixtures files against every JVM, and that every JVM writes the same store() lines.
//
// Usage: node tools/gen-expected.mts [--check]
//   JDKs: JAVA_REFERENCE_JDKS="name=/path/to/bin/java,..." (default: `java` from PATH). Results without a matching JDK
//   (load era, Java 18+) keep their committed values.
//   --check: fail if a committed file is outdated, without writing it.
import fs from 'node:fs';
import path from 'node:path';
import {LOAD_ERAS, loadEra} from '../src/internal/java-version.ts';
import cases from '../test/cases/parse-cases.mts';
import {dateCases, stringifyCases} from '../test/cases/stringify-cases.mts';
import {
    fixtureFiles,
    PARSE_EXPECTED_FILE,
    readFixture,
    readFixtureResult,
    readParseExpected,
    STRINGIFY_EXPECTED_FILE,
    type StringifyExpected,
} from '../test/support/data.mts';
import {type LoadResult, sortedProps} from '../test/support/load-result.mts';
import {type Jdk, jvmDate, jvmLoad, jvmStore, listJdks} from './java-reference/reference.mts';

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
output(PARSE_EXPECTED_FILE, expected);

// Stringify cases: store() of Java 18+ (sorted keys), date line removed
const major = (jdk: Jdk) => Number(jdk.version.replace(/^1\./, '').split(/\D/)[0]);
const storeJdks = jdks.filter((jdk) => major(jdk) >= 18).sort((a, b) => major(b) - major(a));
if (storeJdks.length === 0) {
    console.warn('WARNING: no JDK 18+, keeping committed stringify results');
} else {
    const storeExpected: StringifyExpected = {cases: {}, dates: {}};
    const lines = (out: string) => out.replace(/\r\n/g, '\n').split('\n');
    for (const jdk of [storeJdks[0], ...jdks.filter((j) => j !== storeJdks[0])]) {
        const requests = stringifyCases.flatMap((c) => [
            {props: c.props, comments: c.comments},
            {props: c.props, comments: c.comments, stream: true},
            {props: {}, comments: c.comments}, // to find the date line
        ]);
        const outputs = jvmStore(jdk, requests);
        stringifyCases.forEach((c, i) => {
            const dateLine = lines(outputs[i * 3 + 2]).length - 2;
            const [writer, stream] = [outputs[i * 3], outputs[i * 3 + 1]].map((out) =>
                lines(out)
                    .filter((_, n) => n !== dateLine)
                    .join('\n')
            );
            if (jdk === storeJdks[0]) {
                storeExpected.cases[c.name] = {props: c.props, comments: c.comments, writer, stream};
            } else {
                // Same lines (in hash order before Java 18)
                const ref = storeExpected.cases[c.name];
                const sameLines = (a: string, b: string) => same(a.split('\n').sort(), b.split('\n').sort());
                if (!sameLines(writer, ref.writer) || !sameLines(stream, ref.stream)) {
                    fail(`stringify ${c.name}: ${jdk.name} and ${storeJdks[0].name} write different lines`);
                }
            }
        });
    }
    // Time zone names change across Java versions: the newest JDK is the reference
    const dates = jvmDate(
        storeJdks[0],
        dateCases.map((d) => ({time: d.time, timeZone: d.javaTimeZone}))
    );
    dateCases.forEach((d, i) => {
        storeExpected.dates[d.name] = {time: d.time, timeZone: d.timeZone, java: dates[i]};
    });
    output(STRINGIFY_EXPECTED_FILE, storeExpected);
}
process.exit(failed ? 1 : 0);

function output(file: string, value: unknown) {
    const json = `${JSON.stringify(value, null, 2)}\n`;
    const name = path.relative(ROOT, file);
    if (!check) {
        fs.writeFileSync(file, json);
        console.log(`written ${name}`);
    } else if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === json) {
        console.log(`${name} is up to date`);
    } else {
        fail(`${name} is outdated: run "pnpm run reference:gen"`);
    }
}
