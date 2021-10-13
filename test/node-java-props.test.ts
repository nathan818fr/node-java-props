import fs from 'fs';
import JavaProps from '../src/node-java-props';

describe('parseFile', () => {
    const file = 'testData0.properties';
    it('read and validate ' + file, async () => {
        const res = JSON.parse(fs.readFileSync(__dirname + '/data/' + file + '-result.json', 'utf8'));
        const props = await JavaProps.parseFile(__dirname + '/data/' + file, 'utf8');
        expect(props).toEqual(res);
    });

    it('must throw on read error', async () => {
        let err;
        try {
            await JavaProps.parseFile(__dirname + '/nonexistent-file.properties');
        } catch (e) {
            err = e;
        }
        expect(err).toBeDefined();
    });
});
