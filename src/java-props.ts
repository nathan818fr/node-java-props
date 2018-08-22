import fs from 'fs';
import {convertLine} from './utils';

interface PropertyObject {
    [key: string]: string;
}

class LineReader {
    private readonly str: string;
    private readonly strLen: number;
    private pos = 0;

    public constructor(str: string) {
        this.str = str;
        this.strLen = str.length;
    }

    public readLine(): string {
        let skipWhiteSpace = true;
        let commentLine = false;
        let newLine = true;
        let appendedLineBegin = false;
        let backslash = false;
        let skipLF = false;
        let line = '';
        while (this.pos < this.strLen) {
            const c = this.str[this.pos++];
            if (skipLF) {
                skipLF = false;
                if (c === '\n') {
                    continue;
                }
            }
            if (skipWhiteSpace) {
                if (c === ' ' || c === '\t' || c === '\f') {
                    continue;
                }
                if (!appendedLineBegin && (c === '\r' || c === '\n')) {
                    continue;
                }
                skipWhiteSpace = false;
                appendedLineBegin = false;
            }
            if (newLine) {
                newLine = false;
                if (c === '#' || c === '!') {
                    commentLine = true;
                    continue;
                }
            }

            if (c !== '\n' && c !== '\r') {
                line += c;
                if (c === '\\') {
                    backslash = !backslash;
                } else {
                    backslash = false;
                }
            } else {
                // reached EOL
                if (commentLine || line === '') {
                    commentLine = false;
                    newLine = true;
                    skipWhiteSpace = true;
                    line = '';
                    continue;
                }
                if (backslash) {
                    line = line.substring(0, line.length - 1);
                    skipWhiteSpace = true;
                    appendedLineBegin = true;
                    backslash = false;
                    if (c === '\r') {
                        skipLF = true;
                    }
                } else {
                    return line;
                }
            }
        }
        if (backslash) {
            line = line.substring(0, line.length - 1);
        }
        if (line === '' || commentLine) {
            return undefined;
        }
        return line;
    }
}

export default class JavaPropertiesReader {
    public static loadFile(path: string | Buffer | URL | number, encoding?: string): Promise<PropertyObject> {
        return new Promise((resolve, reject) => {
            fs.readFile(path, {encoding: encoding || 'utf8', flag: 'r'}, (err, data) => {
                if (err) {
                    return reject(err);
                }
                try {
                    const res = this.loadString(data);
                    return resolve(res);
                } catch (err) {
                    /* istanbul ignore next */
                    return reject(err);
                }
            });
        });
    }

    public static loadString(str: string): PropertyObject {
        const result: PropertyObject = {};
        const lr = new LineReader(str);
        let line;
        while ((line = lr.readLine()) !== undefined) {
            let keyLen = 0;
            let valueStart = 0;
            let hasSep = false;
            let backslash = false;

            const lineLen = line.length;
            let pos = 0;
            for (; pos < lineLen; pos++) {
                const c = line[pos];
                if ((c === '=' || c === ':') && !backslash) {
                    valueStart = keyLen + 1;
                    hasSep = true;
                    break;
                } else if ((c === ' ' || c === '\t' || c === '\f') && !backslash) {
                    valueStart = keyLen + 1;
                    break;
                }
                if (c === '\\') {
                    backslash = !backslash;
                } else {
                    backslash = false;
                }
                keyLen++;
            }
            while (valueStart < lineLen) {
                const c = line[valueStart];
                if (c !== ' ' && c !== '\t' && c !== '\f') {
                    if (!hasSep && (c === '=' || c === ':')) {
                        hasSep = true;
                    } else {
                        break;
                    }
                }
                valueStart++;
            }

            const key = convertLine(line.substring(0, keyLen));
            const value = convertLine(line.substring(valueStart));
            result[key] = value;
        }
        return result;
    }

    private constructor() {
        throw new Error('You can\'t instantiate an utility class.');
    }
}
