// Runs the Java reference (JavaReference.java) on one or more JDKs.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type {LoadResult} from '../../test/support/load-result.mts';

const REFERENCE_DIR = import.meta.dirname;
const BUILD_DIR = path.join(REFERENCE_DIR, 'build');

export interface Jdk {
    /** Display name (e.g. "temurin-25") */
    name: string;
    /** Path to the `java` executable */
    java: string;
    /** Value of the java.version system property */
    version: string;
}

const encode = (str: string) => {
    let hex = '';
    for (let i = 0; i < str.length; i++) hex += str.charCodeAt(i).toString(16).padStart(4, '0');
    return hex;
};

const decode = (hex: string) => {
    let str = '';
    for (let i = 0; i < hex.length; i += 4) str += String.fromCharCode(Number.parseInt(hex.slice(i, i + 4), 16));
    return str;
};

/** Compiles the reference program (with the `javac` from PATH, targeting Java 8) if needed. */
function compileReference(): void {
    const source = path.join(REFERENCE_DIR, 'JavaReference.java');
    const output = path.join(BUILD_DIR, 'JavaReference.class');
    if (fs.existsSync(output) && fs.statSync(output).mtimeMs >= fs.statSync(source).mtimeMs) return;
    execFileSync('javac', ['--release', '8', '-Xlint:-options', '-d', BUILD_DIR, source], {stdio: 'inherit'});
}

function run(java: string, requests: string[]): string[] {
    const output = execFileSync(java, ['-cp', BUILD_DIR, 'JavaReference'], {
        input: `${requests.join('\n')}\n`,
        maxBuffer: 1 << 30,
    }).toString('utf8');
    const lines = output.split('\n');
    lines.pop(); // trailing newline
    if (lines.length !== requests.length)
        throw new Error(`JavaReference returned ${lines.length}/${requests.length} lines`);
    return lines;
}

/**
 * Lists the JDKs to use, from the JAVA_REFERENCE_JDKS env var ("name=/path/to/java,name2=/path/to/java2"),
 * or defaults to the `java` from PATH.
 */
export function listJdks(): Jdk[] {
    const spec = process.env.JAVA_REFERENCE_JDKS;
    const entries = spec
        ? spec
              .split(',')
              .map((entry) => entry.trim())
              .filter((entry) => entry !== '')
              .map((entry) => {
                  const eq = entry.indexOf('=');
                  return {name: entry.slice(0, eq), java: entry.slice(eq + 1)};
              })
        : [{name: 'java', java: 'java'}];
    compileReference();
    return entries.map((jdk) => ({...jdk, version: run(jdk.java, ['version'])[0]}));
}

/** Runs Properties.load(Reader) on each input. */
export function jvmLoad(jdk: Jdk, inputs: string[]): LoadResult[] {
    return run(
        jdk.java,
        inputs.map((input) => `load ${encode(input)}`)
    ).map((line) => {
        if (line.startsWith('throw ')) {
            const [, className, message] = line.split(' ');
            return {throws: className, message: decode(message)};
        }
        const props: Record<string, string> = Object.create(null); // keys like "__proto__" must stay data keys
        const body = line.slice('ok '.length);
        if (body !== '') {
            for (const entry of body.split(',')) {
                const [key, value] = entry.split(':');
                props[decode(key)] = decode(value);
            }
        }
        return {props};
    });
}

export interface StoreRequest {
    props: Record<string, string>;
    comments?: string;
    /** store(OutputStream) (`\uXXXX` escapes) instead of store(Writer) */
    stream?: boolean;
}

/** Runs Properties.store() on each request. The outputs include Java's date line. */
export function jvmStore(jdk: Jdk, requests: StoreRequest[]): string[] {
    return run(
        jdk.java,
        requests.map((r) => {
            const entries = Object.keys(r.props).map((k) => `${encode(k)}:${encode(r.props[k])}`);
            const comments = r.comments === undefined ? '-' : encode(r.comments);
            return `store ${r.stream ? 'stream' : 'writer'} ${comments} ${entries.join(',')}`;
        })
    ).map((line) => decode(line.slice('ok '.length)));
}

/** Runs Date.toString() for each epoch time, in a time zone (an id of TimeZone.getTimeZone()). */
export function jvmDate(jdk: Jdk, requests: {time: number; timeZone: string}[]): string[] {
    return run(
        jdk.java,
        requests.map((r) => `date ${r.time} ${r.timeZone}`)
    ).map((line) => decode(line.slice('ok '.length)));
}
