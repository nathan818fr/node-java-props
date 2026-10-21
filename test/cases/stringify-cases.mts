// Cases for stringify() with javaVersion. Java results: stringify-expected.json (`pnpm run reference:gen`).
// Strings are JS strings: '\\' is a single backslash.

export interface StringifyCase {
    name: string;
    props: Record<string, string>;
    comments?: string;
}

export interface DateCase {
    name: string;
    /** Epoch time in milliseconds */
    time: number;
    /** Time zone id for Java's TimeZone.getTimeZone() */
    javaTimeZone: string;
    /** Same time zone, for the `timeZone` option */
    timeZone: string;
}

export const stringifyCases: StringifyCase[] = [
    {name: 'empty', props: {}},
    {name: 'simple', props: {a: '1', b: 'two words'}},
    {name: 'order', props: {b: '1', a: '2', '10': '3', '2': '4', B: '5', é: '6', '': '7'}},
    {name: 'separators and comment chars', props: {'k=:#!': 'v=:#!', '=': ':', '#': '!'}},
    {name: 'spaces', props: {' k e y ': ' v a l u e ', '  ': '  ', tab: '\t', ff: '\f'}},
    {name: 'line terminators', props: {'a\nb': 'c\rd', 'e\r\n': '\n\n'}},
    {name: 'backslashes', props: {'\\': '\\\\', 'a\\b': 'c\\'}},
    {name: 'control chars', props: {'\u0000': '\u0001\u001f', del: '\u007f', vt: '\u000b'}},
    {name: 'non-ASCII', props: {clé: 'é ÿ', Ā: '❤ 👑', bom: '\ufeff', nbsp: '\u00a0', lone: '\ud83d', ls: '\u2028'}},
    {name: 'proto-like keys', props: {['__proto__']: 'a', constructor: 'b'}},
    {name: 'comments: simple', props: {k: 'v'}, comments: 'Generated file'},
    {name: 'comments: empty', props: {}, comments: ''},
    {name: 'comments: multi-line', props: {}, comments: 'line 1\nline 2\r\nline 3\rline 4'},
    {name: 'comments: line starting with # or !', props: {}, comments: 'a\n# b\n! c\n  # d'},
    {name: 'comments: trailing line terminators', props: {}, comments: 'a\n'},
    {name: 'comments: CRLF and CR at the end', props: {}, comments: 'a\r\n\r'},
    {name: 'comments: non-ASCII', props: {}, comments: 'é ÿ Ā ❤ 👑 \u0000 \t'},
]
    // `__proto__` must be a data key
    .map((c) => ({...c, props: Object.assign(Object.create(null), c.props)}));

// Jan 15 and Jul 15 2026, 13:04:05.678 UTC
const WINTER = Date.UTC(2026, 0, 15, 13, 4, 5, 678);
const SUMMER = Date.UTC(2026, 6, 15, 13, 4, 5, 678);

// Time zones where the date comment is exact (see the `timeZone` option)
export const dateCases: DateCase[] = [
    {name: 'UTC', time: WINTER, javaTimeZone: 'UTC', timeZone: 'UTC'},
    {name: 'fixed positive offset', time: WINTER, javaTimeZone: 'GMT+02:00', timeZone: '+02:00'},
    {name: 'fixed negative offset', time: WINTER, javaTimeZone: 'GMT-09:30', timeZone: '-09:30'},
    {name: 'fixed zero offset', time: WINTER, javaTimeZone: 'GMT+00:00', timeZone: '+00:00'},
    {name: 'day change', time: Date.UTC(2026, 11, 31, 23, 30), javaTimeZone: 'GMT+01:00', timeZone: '+01:00'},
    {name: 'single digit day', time: Date.UTC(2026, 1, 3, 1, 2, 3), javaTimeZone: 'UTC', timeZone: 'UTC'},
    {name: 'America/New_York winter', time: WINTER, javaTimeZone: 'America/New_York', timeZone: 'America/New_York'},
    {name: 'America/New_York summer', time: SUMMER, javaTimeZone: 'America/New_York', timeZone: 'America/New_York'},
    {name: 'Europe/Paris winter', time: WINTER, javaTimeZone: 'Europe/Paris', timeZone: 'Europe/Paris'},
    {name: 'Europe/Paris summer', time: SUMMER, javaTimeZone: 'Europe/Paris', timeZone: 'Europe/Paris'},
    {name: 'Europe/London winter', time: WINTER, javaTimeZone: 'Europe/London', timeZone: 'Europe/London'},
    {name: 'Europe/London summer', time: SUMMER, javaTimeZone: 'Europe/London', timeZone: 'Europe/London'},
    {
        name: 'America/Sao_Paulo (no name in Java)',
        time: WINTER,
        javaTimeZone: 'America/Sao_Paulo',
        timeZone: 'America/Sao_Paulo',
    },
];
