/*
 * Deprecated low-level API (`java-props/dist/utils`, public since 2.3.0): the original behavior of java-props only,
 * frozen. Replaced by readEntries(), escapeKey() and escapeValue() of the main module.
 */
import {splitLine} from './internal/java-load';
import {saveConvert} from './internal/java-store';
import {LegacyLineReader, legacyDecode} from './internal/legacy-load';

/**
 * @deprecated Use {@link readEntries}.
 */
export interface ParsedLine {
    line: string;
    sepStart: number;
    valueStart: number;
}

/**
 * Splits a .properties string into logical lines, and calls `consumeFn` with the key/value boundaries of each one.
 *
 * @deprecated Use {@link readEntries}: its `rawKey` and `rawValue`.
 */
export function rawParse(str: string, consumeFn: (res: ParsedLine) => void): void {
    const reader = new LegacyLineReader(str, false);
    for (let line = reader.readLine(); line !== undefined; line = reader.readLine()) {
        consumeFn(splitLine(line));
    }
}

/**
 * Finds the key/value boundaries of a logical line (as returned by {@link LineReader.readLine}).
 * The key is `line.substring(0, sepStart)` and the value is `line.substring(valueStart)`, both still escaped.
 *
 * @deprecated Use {@link readEntries}: its `rawKey` and `rawValue`.
 */
export function rawParseLine(line: string): ParsedLine {
    return splitLine(line);
}

/**
 * Decodes the escape sequences of a key or a value (`\t`, `\uXXXX`, `\=`, ...).
 *
 * @throws Error on malformed `\uXXXX` sequences
 * @deprecated Use {@link readEntries}: its `key` and `value`.
 */
export function decodeLine(line: string): string {
    return legacyDecode(line);
}

/**
 * Escapes a value, or a key if `isKey` is true (keys also escape spaces, separators and comment chars).
 *
 * @deprecated Use {@link escapeKey} or {@link escapeValue}.
 */
export function encodeLine(line: string, isKey?: boolean): string {
    // The original implementation called line.replace(): the same TypeError for anything but a string
    if (typeof line !== 'string') (line as unknown as {replace(): void}).replace();
    return saveConvert(line, !!isKey, !!isKey, true);
}

/**
 * @deprecated Use {@link readEntries}: its `key` and `value`.
 */
export const convertLine = decodeLine;

/**
 * Reads logical lines: skips comments, blank lines and leading whitespace, and joins continuation lines.
 *
 * @deprecated Use {@link readEntries}: its `line`.
 */
export class LineReader {
    public readonly str: string;
    public readonly strLen: number;
    public pos = 0;

    public constructor(str: string) {
        this.str = str;
        this.strLen = str.length;
    }

    /**
     * @return The next logical line, or `undefined` at the end of the input
     */
    public readLine(): string | undefined {
        const reader = new LegacyLineReader(this.str, false);
        reader.pos = this.pos;
        const line = reader.readLine();
        this.pos = reader.pos;
        return line;
    }
}
