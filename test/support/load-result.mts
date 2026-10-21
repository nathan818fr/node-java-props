// Results of Properties.load() / parse(), and the behavior eras of Properties.load().

export type LoadResult = {props: Record<string, string>} | {throws: string; message: string};

/**
 * Behavior eras of Properties.load(), each named after a representative JDK:
 * - jdk8: the original implementation (unchanged from JDK 6 to 10, also in 11.0.0 to 11.0.4 and in 12).
 * - jdk11: JDK-8224202 "Speed up Properties.load" (https://bugs.openjdk.org/browse/JDK-8224202), a rewrite of
 *   Properties.LineReader that also changed its behavior: `#`/`!` right after an empty continuation line starts a
 *   comment, and no state (backslash count, stale buffer content) leaks from comment lines anymore.
 *   Released in JDK 13, and backported to 11.0.5+ (but not to 12).
 * - jdk13: jdk11 + JDK-8224240 "Properties.load fails to throw IAE on malformed unicode in certain circumstances"
 *   (https://bugs.openjdk.org/browse/JDK-8224240): a truncated `\uXXXX` at the end of a line throws, instead of
 *   decoding stale buffer content. JDK 13+ (not backported to 11).
 */
export const LOAD_ERAS = ['jdk8', 'jdk11', 'jdk13'] as const;
export type LoadEra = (typeof LOAD_ERAS)[number];

/** Copies properties into a null-prototype object (so "__proto__" stays a data key), sorted by key. */
export function sortedProps(props: Record<string, string>): Record<string, string> {
    const res: Record<string, string> = Object.create(null);
    for (const key of Object.keys(props).sort()) res[key] = props[key];
    return res;
}

/** Runs a JS parse function and captures its result, or the error it throws. */
export function captureLoad(parse: () => Record<string, string>): LoadResult {
    try {
        return {props: sortedProps(parse())};
    } catch (err) {
        return {throws: (err as Error).name, message: (err as Error).message};
    }
}
