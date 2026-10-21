// Differential fuzzing of the built package (dist/) against real JVMs:
// - parse(input, {javaVersion}) vs Properties.load() of that JDK;
// - stringify(props, {javaVersion}) vs Properties.store() (Writer and OutputStream), date line excluded.
//
// Usage: node tools/fuzz.mts [--runs N] [--seed N]  (needs a build: `pnpm run reference:fuzz` builds first)
//   JDKs: JAVA_REFERENCE_JDKS, like tools/gen-expected.mts.
import {createRequire} from 'node:module';
import fc from 'fast-check';
import {longText, props, text} from '../test/support/arbitraries.mts';
import {captureLoad, type LoadResult} from '../test/support/load-result.mts';
import {jvmLoad, jvmStore, listJdks} from './java-reference/reference.mts';

const arg = (name: string, def: number) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? Number(process.argv[i + 1]) : def;
};
const runs = arg('--runs', 20000);
const seed = arg('--seed', Date.now() % 1e9);
console.log(`runs: ${runs}, seed: ${seed}`);

const {parse, stringify} = createRequire(import.meta.url)('../dist/node-java-props.js');

const inputs = fc.sample(fc.oneof({arbitrary: text(30), weight: 9}, {arbitrary: longText, weight: 1}), {
    numRuns: runs,
    seed,
});
const stores = fc.sample(fc.record({props, comments: fc.option(text(8), {nil: undefined})}), {
    numRuns: Math.ceil(runs / 4),
    seed,
});

// Same properties, or both throw (same message for IllegalArgumentException)
const sameAsJava = (js: LoadResult, java: LoadResult) => {
    if ('throws' in java) {
        return 'throws' in js && (java.throws !== 'java.lang.IllegalArgumentException' || js.message === java.message);
    }
    return (
        !('throws' in js) &&
        JSON.stringify(Object.entries(js.props).sort()) === JSON.stringify(Object.entries(java.props).sort())
    );
};

let failures = 0;
const report = (what: string, details: unknown) => {
    if (++failures <= 10) console.error(`MISMATCH ${what}\n${JSON.stringify(details, null, 2)}`);
};

for (const jdk of listJdks()) {
    const major = Number(jdk.version.replace(/^1\./, '').split(/\D/)[0]);
    const before = failures;

    jvmLoad(jdk, inputs).forEach((java, i) => {
        const js = captureLoad(() => parse(inputs[i], {javaVersion: jdk.version}));
        if (!sameAsJava(js, java)) report(`parse (${jdk.name})`, {input: inputs[i], js, java});
    });

    const requests = stores.flatMap((s) => [s, {...s, stream: true}, {props: {}, comments: s.comments}]);
    const outputs = jvmStore(jdk, requests);
    stores.forEach((s, i) => {
        const dateLine = outputs[i * 3 + 2].split('\n').length - 2;
        for (const [k, stream] of [
            [0, false],
            [1, true],
        ] as const) {
            const java = outputs[i * 3 + k].split('\n').filter((_, n) => n !== dateLine);
            const js = stringify(s.props, {
                javaVersion: jdk.version,
                comments: s.comments,
                date: false,
                lineSeparator: '\n',
                escapeUnicode: stream,
            }).split('\n');
            // Before Java 18, store() writes in hash order
            const same =
                major >= 18
                    ? js.join('\n') === java.join('\n')
                    : JSON.stringify(js.sort()) === JSON.stringify(java.sort());
            if (!same) report(`stringify (${jdk.name}, ${stream ? 'OutputStream' : 'Writer'})`, {...s, js, java});
        }
    });

    console.log(`${jdk.name} (${jdk.version}): ${failures === before ? 'OK' : `${failures - before} mismatches`}`);
}
process.exit(failures ? 1 : 0);
