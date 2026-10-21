// Checks the npm package (dev only: needs a recent Node.js, npm and a build).
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

// Entry points. Users also import `java-props/dist/*` directly: every dist module is public.
assert.equal(pkg.main, 'dist/node-java-props.js');
assert.equal(pkg.browser, 'dist/java-props.js');
const [pack] = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
        cwd: ROOT,
        shell: process.platform === 'win32', // npm.cmd
    })
);
const files = pack.files.map((f) => f.path);
const required = ['java-props', 'node-java-props', 'utils'].flatMap((name) =>
    ['.js', '.d.ts', '.js.map'].map((ext) => `dist/${name}${ext}`)
);
assert.deepEqual(
    required.filter((file) => !files.includes(file)),
    [],
    'files missing from the package'
);

// Fields that would break existing users
assert.equal(pkg.exports, undefined, '"exports" would block the `java-props/dist/*` imports');
assert.ok(pkg.type === undefined || pkg.type === 'commonjs', 'the package must stay CommonJS');
assert.equal(pkg.engines, undefined, '"engines" could reject installs on old Node.js versions');
assert.equal(pkg.dependencies, undefined, 'no runtime dependencies');

// The browser entry, and every module it requires, must not require Node.js modules
const requires = (file) =>
    [...fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]);
const seen = new Set();
const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const dep of requires(file)) {
        assert.ok(dep.startsWith('./') || dep.startsWith('../'), `${file} requires ${dep}`);
        visit(path.join(path.dirname(file), `${dep}.js`));
    }
};
visit(pkg.browser);

console.log(`OK: package content (${files.length} files)`);
