// fast-check arbitraries for .properties content.
import fc from 'fast-check';

// Pieces of .properties text that matter to the parser, and some that don't (backslash weighted)
const PIECES = [
    ...['\\', '\\', '\\', '\\u', '\\u00', '\\u0041', '\\\n', '\\\r\n'],
    ...['\n', '\r', '\r\n', '\n#', '\n!', ' ', '\t', '\f', '=', ':', '#', '!'],
    ...['a', 'k', 'v', 'u', '0', 'F', 'g', 'n', 't', 'é'],
    ...['\u0000', '\u007F', '\u00A0', '\uFEFF', '\uD83D', '\uDC51'],
];
export const text = (maxPieces: number) =>
    fc.array(fc.constantFrom(...PIECES), {maxLength: maxPieces}).map((pieces) => pieces.join(''));

/** Text with long lines too, to exceed Java's initial line buffer (1024 chars) */
export const longText = fc
    .array(
        fc.oneof(
            text(24),
            fc.constantFrom('a', '\\\\', '=').map((c) => c.repeat(1000))
        ),
        {maxLength: 6}
    )
    .map((parts) => parts.join(''));

/** Properties with tricky keys and values */
export const props = fc.dictionary(text(8), text(8));
