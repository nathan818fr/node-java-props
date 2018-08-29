import {convertLine, LineReader} from './utils';

export interface Properties {
    [key: string]: string;
}

export function parse(str: string): Properties {
    const result: Properties = {};
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

export default {
    parse,
};
