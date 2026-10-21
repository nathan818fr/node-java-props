// Results of Properties.load() / parse().

export type LoadResult = {props: Record<string, string>} | {throws: string; message: string};

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
