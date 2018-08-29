import fs from 'fs';
import JavaProps from '../src/node-java-props';

describe('parseFile', () => {
    it('read and validate test.properties', async () => {
        const res = JSON.parse(fs.readFileSync(__dirname + '/test.properties-result.json', 'utf8'));
        const props = await JavaProps.parseFile(__dirname + '/test.properties', 'utf8');
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
