// Compiles test/compat/types/consumer.ts against the package declarations with a given TypeScript version.
// Usage: node test/compat/check-types.mjs <typescript version> (needs a build)
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '../..');
const tsVersion = process.argv[2];
if (!tsVersion) throw new Error('Usage: check-types.mjs <typescript version>');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'java-props-types-'));
try {
    // Fake installed package (old TypeScript versions only use "main" when the .js file exists)
    const installed = path.join(tmp, 'node_modules/java-props');
    fs.mkdirSync(installed, {recursive: true});
    fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(installed, 'package.json'));
    fs.cpSync(path.join(ROOT, 'dist'), path.join(installed, 'dist'), {recursive: true});
    fs.cpSync(path.join(import.meta.dirname, 'types/stub'), path.join(tmp, 'types'), {recursive: true});
    fs.copyFileSync(path.join(import.meta.dirname, 'types/consumer.ts'), path.join(tmp, 'consumer.ts'));

    const tsc = (args) =>
        execFileSync('pnpm', ['--silent', 'dlx', '--package', `typescript@${tsVersion}`, 'tsc', ...args], {
            cwd: tmp,
            encoding: 'utf8',
        });
    const major = Number(
        tsc(['--version'])
            .replace(/^Version /, '')
            .split('.')[0]
    );

    const base = {noEmit: true, noImplicitAny: true, strictNullChecks: true, typeRoots: ['./types'], types: ['node']};
    const configs = {
        node10: {...base, module: 'commonjs', moduleResolution: 'node', target: 'es6', lib: ['es6']},
        nodenext: {...base, module: 'nodenext', moduleResolution: 'nodenext', target: 'es2022', lib: ['es2022']},
        bundler: {...base, module: 'preserve', moduleResolution: 'bundler', target: 'es2022', lib: ['es2022']},
    };
    // node10 resolution is deprecated in TypeScript 6 and removed in 7; module "preserve" needs TypeScript 5.4+
    if (major === 6) configs.node10.ignoreDeprecations = '6.0';
    const names =
        major >= 7
            ? ['nodenext', 'bundler']
            : major === 6
              ? ['node10', 'nodenext', 'bundler']
              : major === 5
                ? ['node10', 'nodenext']
                : ['node10'];
    for (const name of names) {
        fs.writeFileSync(
            path.join(tmp, 'tsconfig.json'),
            JSON.stringify({compilerOptions: configs[name], files: ['consumer.ts']})
        );
        try {
            tsc(['-p', '.']);
        } catch (err) {
            console.error(err.stdout || err);
            throw new Error(`TypeScript ${tsVersion} (${name}) failed`);
        }
        console.log(`OK: TypeScript ${tsVersion} (${name})`);
    }
} finally {
    fs.rmSync(tmp, {recursive: true, force: true});
}
