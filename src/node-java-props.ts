import fs from 'fs';
import {Properties, parse, stringify} from './java-props';

export * from './java-props';

export function parseFile(path: string | Buffer | URL | number, encoding?: string): Promise<Properties> {
    return new Promise((resolve, reject) => {
        fs.readFile(path, {encoding: encoding || 'utf8', flag: 'r'}, (err, data) => {
            if (err) {
                return reject(err);
            }
            try {
                const res = parse(data);
                return resolve(res);
            } catch (err) {
                /* istanbul ignore next */
                return reject(err);
            }
        });
    });
}

export default {
    parse,
    parseFile,
    stringify,
};
