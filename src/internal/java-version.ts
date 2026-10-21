/**
 * Behavior eras of Properties.load(), each named after its first JDK:
 * - jdk8: the original implementation.
 * - jdk9: comments are skipped quickly up to their first backslash, so only the rest of a comment is written to the
 *   line buffer (and read by later decoding).
 * - jdk11: JDK-8224202 "Speed up Properties.load", a rewrite of LineReader that also changed its behavior: `#`/`!`
 *   after an empty continuation line starts a comment, and nothing leaks from comment lines anymore.
 * - jdk13: jdk11 + JDK-8224240: a truncated `\uXXXX` at the end of a line throws, instead of decoding stale content.
 */
export const LOAD_ERAS = ['jdk8', 'jdk9', 'jdk11', 'jdk13'] as const;
export type LoadEra = (typeof LOAD_ERAS)[number];

const ACCEPTED = 'a major version (6 or more), a java.version string (e.g. "11.0.4", "1.8.0_392") or "latest"';

/**
 * Behavior era of Properties.load() for a Java version: a major version (`8`, `17`...), a `java.version` string
 * (`'11.0.4'`, `'1.8.0_392'`, `'21.0.2+13-LTS'`...) or `'latest'`. A major version alone means its latest update.
 *
 * @throws TypeError if `javaVersion` is neither a number nor a string
 * @throws RangeError if `javaVersion` is not a valid Java version, or is older than Java 6
 */
export function loadEra(javaVersion: number | string): LoadEra {
    if (javaVersion !== cachedVersion) {
        cachedEra = resolveEra(javaVersion);
        cachedVersion = javaVersion;
    }
    return cachedEra;
}

let cachedVersion: number | string | undefined; // escapeKey/escapeValue resolve it on each call
let cachedEra: LoadEra;

function resolveEra(javaVersion: number | string): LoadEra {
    const [major, update] = parseVersion(javaVersion);
    if (major >= 13) return 'jdk13';
    if (major === 11 && update >= 5) return 'jdk11'; // JDK-8224202 was backported to 11.0.5 (not to 12)
    if (major >= 9) return 'jdk9';
    if (major >= 6) return 'jdk8';
    throw invalid(javaVersion);
}

// [major, update] of a Java version. A missing update means the latest one, and 'latest' the latest version.
function parseVersion(javaVersion: number | string): [number, number] {
    if (javaVersion === 'latest') return [Infinity, Infinity];
    if (typeof javaVersion === 'number') {
        if (!Number.isInteger(javaVersion)) throw invalid(javaVersion);
        return [javaVersion, Infinity];
    }
    if (typeof javaVersion !== 'string') {
        throw new TypeError(`Invalid javaVersion type (${typeof javaVersion}): expected ${ACCEPTED}`);
    }
    // "11.0.4", "21.0.2+13-LTS", "17-ea" (Java 9+), or "1.8.0_392" (up to Java 8: "1.<major>")
    const m = /^(\d+)(?:\.(\d+)(?:\.(\d+))?)?(?:\.\d+)*(?:_\d+)?(?:[-+].*)?$/.exec(javaVersion);
    if (!m) throw invalid(javaVersion);
    const [, first, second, update] = m;
    if (first === '1') {
        if (second === undefined) throw invalid(javaVersion);
        return [Number(second), Infinity];
    }
    return [Number(first), update === undefined ? Infinity : Number(update)];
}

function invalid(javaVersion: number | string): RangeError {
    return new RangeError(`Invalid javaVersion ${JSON.stringify(javaVersion)}: expected ${ACCEPTED}`);
}
