// Minimal stand-in for @types/node: enough for the java-props declarations, and parseable by any TypeScript version.
declare class Buffer {
    static from(str: string): Buffer;
}
declare class URL {
    constructor(url: string);
}
