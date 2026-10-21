# Test fixtures

Each `x.properties` file (and its CRLF variant `x.crlf.properties`, if any) is parsed and compared to
`x.expected.json`. The expected results are checked against real JVMs by `pnpm run reference:check`.

The `.properties` files are byte-exact (see `.gitattributes`): some use CRLF or mixed line endings on purpose.

- `syntax`: separators, escapes, comments, continuation lines, keys without value.
- `backslashes`: trailing backslashes.
- `multiline`: values and keys spanning several lines (continuation lines).
- `mixed-line-endings`: LF, CRLF and CR in the same file.
