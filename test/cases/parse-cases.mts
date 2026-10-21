// Edge cases for parse(). Java results: parse-expected.json (`pnpm run reference:gen`), ours: parse-snapshot.json.
// Inputs are JS strings: '\\' is a single backslash in the .properties content.

export interface ParseCase {
    name: string;
    input: string;
}

const cases: ParseCase[] = [];
const add = (group: string, entries: Record<string, string>) => {
    for (const [name, input] of Object.entries(entries)) cases.push({name: `${group}: ${name}`, input});
};

add('empty', {
    'empty string': '',
    'only LF': '\n',
    'only CR': '\r',
    'only CRLF': '\r\n',
    'only whitespace': ' \t\f ',
    'whitespace lines': '  \n\t\n\f\r\n',
});

add('line terminators', {
    LF: 'a=1\nb=2\n',
    CR: 'a=1\rb=2\r',
    CRLF: 'a=1\r\nb=2\r\n',
    LFCR: 'a=1\n\rb=2\n\r',
    mixed: 'a=1\nb=2\rc=3\r\nd=4',
    'no final terminator': 'a=1\nb=2',
    'blank lines between': 'a=1\n\n\r\n\r\rb=2',
    'U+2028 and U+2029 are not terminators': 'a=1\u2028b=2\u2029c=3\n',
    'NEL (U+0085) is not a terminator': 'a=1\u0085b=2',
    'vertical tab is not whitespace': '\u000Ba=1',
});

add('separators', {
    equals: 'key=value',
    colon: 'key:value',
    space: 'key value',
    tab: 'key\tvalue',
    'form feed': 'key\fvalue',
    'spaces around equals': 'key  =  value',
    'spaces around colon': 'key \t: \fvalue',
    'equals then colon': 'key=:value',
    'colon then equals': 'key:=value',
    'two equals': 'key==value',
    'space then two equals': 'key = = value',
    'space then colon then space': 'key : value',
    'whitespace only separator, then equals in value': 'key  value=x',
    'no separator (key only)': 'key',
    'key only with trailing spaces': 'key   ',
    'key then separator, no value': 'key=',
    'key then separator and spaces, no value': 'key =   ',
    'empty key (equals)': '=value',
    'empty key (colon)': ':value',
    'empty key, empty value': '=',
    'leading whitespace before empty key': '   =value',
    'escaped separator in key': 'a\\=b=c',
    'escaped colon in key': 'a\\:b:c',
    'escaped space in key': 'a\\ b c',
    'escaped tab in key': 'a\\\tb c',
    'double backslash before separator': 'a\\\\=b',
    'triple backslash before separator': 'a\\\\\\=b=c',
    'separator chars in value': 'k=a=b:c d',
    'value with leading escaped space': 'k=\\  v',
    'value trailing whitespace kept': 'k=v \t\f',
});

add('comments', {
    hash: '# comment\nk=v',
    bang: '! comment\nk=v',
    'indented hash': '   # comment\nk=v',
    'indented bang with tab': '\t! comment\nk=v',
    'comment at EOF without terminator': 'k=v\n# comment',
    'hash inside key is not a comment': 'a#b=c',
    'hash inside value': 'k=v # not a comment',
    'escaped hash key': '\\#k=v',
    'comment ending with backslash does not continue': '# comment \\\nk=v',
    'comment ending with two backslashes': '# comment \\\\\nk=v',
    'comment ending with backslash then CRLF': '# comment \\\r\nk=v',
    'comment ending with backslash at EOF': 'k=v\n# comment \\',
    'only comments': '#a\n!b\n  # c',
    'comment with CR terminator': '# c\rk=v',
});

add('continuation', {
    simple: 'k=a\\\nb',
    'leading whitespace of next line skipped': 'k=a\\\n   \t\fb',
    CRLF: 'k=a\\\r\nb',
    CR: 'k=a\\\rb',
    'LFCR is two terminators': 'k=a\\\n\rb=c',
    multiple: 'k=a\\\nb\\\nc',
    'in key': 'ke\\\ny=v',
    'in separator area': 'k\\\n = v',
    'escaped backslash at EOL is not a continuation': 'k=a\\\\\nb=c',
    'three backslashes at EOL': 'k=a\\\\\\\nb',
    'to an empty line': 'k=a\\\n\nb=c',
    'to a whitespace-only line': 'k=a\\\n   \nb=c',
    'to a comment-looking line': 'k=a\\\n# not a comment',
    'to a bang-looking line': 'k=a\\\n!x',
    'at EOF': 'k=v\\',
    'at EOF after LF': 'k=v\\\n',
    'twice at EOF': 'k=v\\\n\\\n',
    'continued line starting with escaped space': 'k=a\\\n\\ b',
    'CR then LF on continued line start': 'k=a\\\r\n\r\nb=c',
});

add('lone continuation backslash', {
    alone: '\\',
    'alone with LF': '\\\n',
    'alone with CRLF': '\\\r\n',
    'after property': 'a=1\n\\',
    'after property, with LF': 'a=1\n\\\n',
    indented: '   \\',
    'followed by whitespace line': '\\\n   ',
    'followed by empty line': '\\\n\n',
    'followed by property': '\\\nk=v',
});

// Comment or key? Changed by JDK-8224202 (see LOAD_ERAS in test/support/load-result.mts).
add('empty continuation then comment char', {
    hash: '\\\n#foo=bar\nbaz=1',
    'bang with indentation': '  \\\n!x=1',
    'hash after CRLF': '\\\r\n#c\r\nk=v',
    'hash with leading whitespace on next line': '\\\n   #c\nk=v',
    'double continuation then hash': '\\\n\\\n#c\nk=v',
});

// JDK 8 keeps state from comment lines (fixed by JDK-8224202), java-props counts backslashes differently.
add('comment ending with backslash, then backslashes', {
    'comment ending with backslash, then backslash-only line': '#comment \\\n\\\\',
    'bang comment, CRLF, lone backslash': '!\\\r\n\\',
    'comment backslash, then key with trailing escaped backslash': '#\\\nk=\\\\',
    'comment with 3 backslashes, then backslashes': '#\\\\\\\n\\\\\\\\',
});

// JDK 8 reads stale chars of its reused line buffer (partly fixed by JDK-8224202, then by JDK-8224240).
add('stale line buffer', {
    'lone backslash decode after comment': '#\\v\\\r\n\t\\',
    'truncated unicode after longer line': 'abcdef12\na=\\u00',
    'truncated unicode after longer non-hex line': 'abcdef1z\na=\\u00',
    'truncated unicode in key after longer line': 'xxxxxx0041\n\\u00',
});

add('escapes', {
    'standard escapes': 'k=\\t\\n\\r\\f',
    'unknown escapes drop the backslash': 'k=\\a\\b\\c\\d\\e\\g\\z\\0\\9',
    'escaped backslash': 'k=\\\\',
    'escaped quote chars': 'k=\\"\\\'',
    'escapes in key': '\\t\\n\\r\\f\\a=v',
    'escaped separators in value': 'k=\\=\\:\\ \\#\\!',
    'backslash before non-ASCII': 'k=\\é\\❤',
    'backslash before U+2028': 'k=\\\u2028',
    'backslash before NUL': 'k=\\\u0000',
});

add('unicode escapes', {
    'lowercase hex': 'k=\\u00e9',
    'uppercase hex': 'k=\\u00E9',
    'mixed case hex': 'k=\\uAbCd',
    'in key': '\\u0041=v',
    NUL: 'k=\\u0000',
    'surrogate pair': 'k=\\uD83D\\uDC51',
    'lone high surrogate': 'k=\\uD83D',
    'lone low surrogate': 'k=\\uDC51',
    'escaped separator via unicode is not a separator': 'k\\u003Dx=v',
    'unicode escaped backslash': 'k=\\u005Cn',
    'followed by more chars': 'k=\\u00410',
    'uppercase U is not an escape': 'k=\\U0041',
    'escaped u': 'k=\\\\u0041',
    'malformed: non-hex': 'k=\\u00g1',
    'malformed: too short at end': 'k=\\u12',
    'malformed: empty at end': 'k=\\u',
    'malformed: in key': '\\uZZZZ=v',
    'malformed: short then separator': 'k\\u12=v',
    'malformed: spans continuation': 'k=\\u00\\\n41',
    'malformed: plus sign': 'k=\\u+123',
    'malformed: fullwidth digits': 'k=\\u\uFF10\uFF10\uFF14\uFF11',
});

add('raw characters', {
    'non-ASCII key and value': 'clé=valeur é ❤',
    'emoji (surrogate pair)': 'k=👑',
    'lone surrogate': 'k=\uD83D',
    'NUL char': 'k=a\u0000b',
    'control chars': 'k=\u0001\u001F\u007F',
    'BOM is not stripped': '\uFEFFk=v',
    'BOM on second line': 'a=1\n\uFEFFk=v',
    'non-breaking space is not whitespace': '\u00A0k=v',
    'fullwidth equals is not a separator': 'k\uFF1Dv',
});

add('keys', {
    'duplicate keys: last wins': 'k=1\nk=2\nk=3',
    'duplicate via escapes': 'k=1\n\\k=2',
    'proto-like keys': '__proto__=a\nconstructor=b\nhasOwnProperty=c\ntoString=d',
    'numeric keys': '2=b\n10=c\n1=a\n-1=d\n01=e',
    'long key and value': `${'k'.repeat(300)}=${'v'.repeat(10000)}`,
    'long line before short lines': `${'x'.repeat(200)}=y\na=\\`,
});

export default cases;
