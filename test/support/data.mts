// Test fixtures (test/fixtures) and the Java results of the edge cases (test/cases).
import fs from 'node:fs';
import path from 'node:path';
import type {LoadEra} from '../../src/internal/java-version.ts';
import type {LoadResult} from './load-result.mts';

export const FIXTURES_DIR = path.join(import.meta.dirname, '../fixtures');
export const PARSE_EXPECTED_FILE = path.join(import.meta.dirname, '../cases/parse-expected.json');
export const STRINGIFY_EXPECTED_FILE = path.join(import.meta.dirname, '../cases/stringify-expected.json');

/** The .properties files of test/fixtures. */
export function fixtureFiles(): string[] {
    return fs
        .readdirSync(FIXTURES_DIR)
        .filter((file) => file.endsWith('.properties'))
        .sort();
}

export function readFixture(file: string): string {
    return fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8');
}

/**
 * Expected result of a fixture: `x.expected.json`, for `x.properties` and its CRLF variant `x.crlf.properties`.
 */
export function readFixtureResult(file: string): Record<string, string> {
    return JSON.parse(readFixture(file.replace(/(\.crlf)?\.properties$/, '.expected.json')));
}

export type ParseExpected = Record<string, {input: string} & Record<LoadEra, LoadResult>>;

/** Reads parse-expected.json (not imported as a module: Vite rejects lone surrogate escapes like "\ud83d"). */
export function readParseExpected(): ParseExpected {
    return JSON.parse(fs.readFileSync(PARSE_EXPECTED_FILE, 'utf8'));
}

export interface StringifyExpected {
    /** Inputs, and the outputs of store(Writer) and store(OutputStream) without the date line */
    cases: Record<string, {props: Record<string, string>; comments?: string; writer: string; stream: string}>;
    /** Inputs (`timeZone` option), and the Date.toString() of Java */
    dates: Record<string, {time: number; timeZone: string; java: string}>;
}

export function readStringifyExpected(): StringifyExpected {
    return JSON.parse(fs.readFileSync(STRINGIFY_EXPECTED_FILE, 'utf8'));
}
