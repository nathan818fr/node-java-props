import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import JavaProps from '../../src/node-java-props';
import {FIXTURES_DIR, readFixtureResult} from '../support/data.mts';

const file = path.join(FIXTURES_DIR, 'syntax.properties');
const expected = readFixtureResult('syntax.properties');

describe('parseFile', () => {
    let tmpDir: string;
    beforeAll(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'java-props-'));
    });
    afterAll(() => {
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it('reads a file path (utf8 by default)', async () => {
        expect(await JavaProps.parseFile(file)).toEqual(expected);
        expect(await JavaProps.parseFile(file, 'utf8')).toEqual(expected);
    });

    it('reads a Buffer path, a file URL and a file descriptor', async () => {
        expect(await JavaProps.parseFile(Buffer.from(file))).toEqual(expected);
        expect(await JavaProps.parseFile(pathToFileURL(file))).toEqual(expected);
        const fd = fs.openSync(file, 'r');
        try {
            expect(await JavaProps.parseFile(fd)).toEqual(expected);
        } finally {
            fs.closeSync(fd);
        }
    });

    it('uses the given encoding', async () => {
        const latin1File = path.join(tmpDir, 'latin1.properties');
        fs.writeFileSync(latin1File, Buffer.from('k=\u00e9\n', 'latin1'));
        expect(await JavaProps.parseFile(latin1File, 'latin1')).toEqual({k: '\u00e9'});
        expect(await JavaProps.parseFile(latin1File)).toEqual({k: '\ufffd'});
    });

    it('keeps the UTF-8 BOM (like Java)', async () => {
        const bomFile = path.join(tmpDir, 'bom.properties');
        fs.writeFileSync(bomFile, '\ufeffk=v\n');
        expect(await JavaProps.parseFile(bomFile)).toEqual({'\ufeffk': 'v'});
    });

    it('accepts parse options', async () => {
        const badEnd = path.join(tmpDir, 'bad-end.properties');
        fs.writeFileSync(badEnd, Buffer.from('k=é\\', 'latin1'));
        expect(await JavaProps.parseFile(badEnd, 'latin1', {javaVersion: 8})).toEqual({k: 'é'});
        expect(await JavaProps.parseFile(badEnd, {encoding: 'latin1', javaVersion: 8})).toEqual({k: 'é'});
        expect(await JavaProps.parseFile(file, {javaVersion: 25})).toEqual(expected);
    });

    it('rejects on read error', async () => {
        await expect(JavaProps.parseFile(path.join(FIXTURES_DIR, 'nonexistent.properties'))).rejects.toMatchObject({
            code: 'ENOENT',
        });
    });

    it('rejects on invalid options, without reading the file', async () => {
        const missing = path.join(FIXTURES_DIR, 'nonexistent.properties');
        await expect(JavaProps.parseFile(missing, {javaVersion: 'nope'})).rejects.toThrow(RangeError);
        await expect(JavaProps.parseFile(missing, 'utf8', {javaVersion: 5})).rejects.toThrow(RangeError);
    });

    it('rejects on invalid encoding', async () => {
        await expect(JavaProps.parseFile(file, 'not-an-encoding')).rejects.toThrow();
    });

    it('rejects on parse error', async () => {
        const badFile = path.join(tmpDir, 'bad.properties');
        fs.writeFileSync(badFile, 'k=\\u12\n');
        await expect(JavaProps.parseFile(badFile)).rejects.toThrow('Malformed \\uxxxx encoding.');
    });
});
