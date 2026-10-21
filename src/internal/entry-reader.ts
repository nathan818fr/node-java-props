// Implementation of the EntryReader returned by readEntries() (see java-props.ts for the documented interface).
import {JavaLineReader, javaDecode, splitLine} from './java-load';
import {LoadEra} from './java-version';
import {LegacyLineReader, legacyDecode} from './legacy-load';

export class EntryReaderImpl {
    private current: string | undefined; // logical line of the current entry
    private sepStart = 0;
    private valueStart = 0;
    private decodedKey: string | undefined;
    private decodedValue: string | undefined;
    private readonly str: string;
    private readonly era: LoadEra | undefined;
    private readonly java: JavaLineReader | undefined;
    private readonly legacy: LegacyLineReader | undefined;
    private readonly track: boolean;
    // Line counting for startLine/startColumn, done lazily up to the entries' starts (always forward)
    private counted = 0;
    private countedLines = 1;
    private countedLineStart = 0;
    private countedAfterCR = false;

    public constructor(str: string, era: LoadEra | undefined, track: boolean) {
        this.str = str;
        this.era = era;
        this.track = track;
        if (era === undefined) {
            this.legacy = new LegacyLineReader(str, track);
        } else {
            this.java = new JavaLineReader(str, era, track);
        }
    }

    public next(): boolean {
        this.decodedKey = undefined;
        this.decodedValue = undefined;
        this.current = this.java ? this.java.readLine() : (this.legacy as LegacyLineReader).readLine();
        if (this.current === undefined) return false;
        const split = splitLine(this.current);
        this.sepStart = split.sepStart;
        this.valueStart = split.valueStart;
        return true;
    }

    public get line(): string {
        return this.current as string;
    }

    public get rawKey(): string {
        return (this.current === undefined ? undefined : this.current.substring(0, this.sepStart)) as string;
    }

    public get rawValue(): string {
        return (this.current === undefined ? undefined : this.current.substring(this.valueStart)) as string;
    }

    public get key(): string {
        if (this.decodedKey === undefined && this.current !== undefined) {
            // Java can read past the key: into the rest of the line
            this.decodedKey = this.decode(this.rawKey, this.sepStart);
        }
        return this.decodedKey as string;
    }

    public get value(): string {
        if (this.decodedValue === undefined && this.current !== undefined) {
            this.decodedValue = this.decode(this.rawValue, this.current.length);
        }
        return this.decodedValue as string;
    }

    public get start(): number {
        return this.position(this.java ? this.java.start : (this.legacy as LegacyLineReader).start);
    }

    public get end(): number {
        return this.position(this.java ? this.java.end : (this.legacy as LegacyLineReader).end);
    }

    public get startLine(): number {
        return this.position(this.countLines() ? this.countedLines : 0);
    }

    public get startColumn(): number {
        return this.position(this.countLines() ? this.start - this.countedLineStart + 1 : 0);
    }

    private position(value: number): number {
        return (this.track && this.current !== undefined ? value : undefined) as number;
    }

    // Counts the line terminators (CR, LF, CRLF) up to the start of the current entry
    private countLines(): boolean {
        if (!this.track || this.current === undefined) return false;
        const str = this.str;
        const start = this.start;
        for (let i = this.counted; i < start; i++) {
            const c = str[i];
            if (c === '\r' || (c === '\n' && !this.countedAfterCR)) this.countedLines++;
            if (c === '\r' || c === '\n') this.countedLineStart = i + 1;
            this.countedAfterCR = c === '\r';
        }
        if (start > this.counted) this.counted = start;
        return true;
    }

    // Decodes a key or a value, followed in the line by what starts at `followedFrom`. In Java mode, decoding can also
    // read past the line: leftovers of Java's line buffer (still the one of this entry). It only reads past `raw` after
    // a backslash.
    private decode(raw: string, followedFrom: number): string {
        if (!this.java) return legacyDecode(raw);
        const followedBy =
            raw.indexOf('\\') < 0 ? '' : (this.current as string).substring(followedFrom) + this.java.tail();
        return javaDecode(raw, followedBy, this.era as LoadEra);
    }
}
