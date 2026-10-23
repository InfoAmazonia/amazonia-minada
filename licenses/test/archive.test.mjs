import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import AdmZip from 'adm-zip';
import { downloadArchive, extractValidatedArchive, validateShapefile } from '../src/utils/import-archive.mjs';
import { archiveBuffer } from './fixtures.mjs';

const required = ['BRASIL.shp', 'BRASIL.dbf'];
const temp = t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minada-zip-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    return dir;
};

for (const kind of ['403', 'html', 'truncated', 'missing', 'crc', 'unsafe']) {
    test(`reject ${kind} and preserve existing files`, async t => {
        const dir = temp(t);
        const archive = path.join(dir, 'data.zip');
        let bytes = archiveBuffer({ missing: kind === 'missing' });
        if (kind === 'html') bytes = Buffer.from('<html>Access denied</html>');
        if (kind === 'truncated') bytes = bytes.subarray(0, bytes.length - 15);
        if (kind === 'crc') {
            // Corrupt only the central-directory checksum, retaining valid compressed bytes.
            const offset = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
            bytes.writeUInt32LE((bytes.readUInt32LE(offset + 16) ^ 1) >>> 0, offset + 16);
        }
        if (kind === 'unsafe') {
            const zip = new AdmZip(bytes);
            zip.addFile('../escape.txt', Buffer.from('bad'));
            bytes = zip.toBuffer();
        }
        const server = http.createServer((_, res) => { res.statusCode = kind === '403' ? 403 : 200; res.end(bytes); });
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        t.after(() => new Promise(resolve => server.close(resolve)));
        fs.writeFileSync(archive, 'previous archive');
        fs.writeFileSync(path.join(dir, 'BRASIL.shp'), 'previous shape');
        const url = `http://127.0.0.1:${server.address().port}/download`;
        if (kind === '403') {
            await assert.rejects(downloadArchive(url, archive), /HTTP 403/);
            assert.equal(fs.readFileSync(archive, 'utf8'), 'previous archive');
            assert.equal(fs.existsSync(`${archive}.part`), false);
        } else {
            await downloadArchive(url, archive);
            assert.throws(() => extractValidatedArchive(archive, path.join(dir, 'staged'), required));
        }
        assert.equal(fs.readFileSync(path.join(dir, 'BRASIL.shp'), 'utf8'), 'previous shape');
    });
}

test('reject interrupted HTTP response and remove partial file', async t => {
    const dir = temp(t), archive = path.join(dir, 'data.zip');
    fs.writeFileSync(archive, 'previous archive');
    const server = http.createServer((_, res) => {
        res.writeHead(200, { 'Content-Length': 10000 });
        res.write('partial');
        setTimeout(() => res.destroy(), 20);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    await assert.rejects(downloadArchive(`http://127.0.0.1:${server.address().port}`, archive));
    assert.equal(fs.readFileSync(archive, 'utf8'), 'previous archive');
    assert.equal(fs.existsSync(`${archive}.part`), false);
});

test('valid archive and shapefile; reject truncated or empty shape/DBF', t => {
    const dir = temp(t), archive = path.join(dir, 'data.zip');
    fs.writeFileSync(archive, archiveBuffer());
    extractValidatedArchive(archive, dir, required);
    const shp = path.join(dir, 'BRASIL.shp'), dbf = path.join(dir, 'BRASIL.dbf');
    assert.equal(validateShapefile(shp, dbf), 2);
    const data = fs.readFileSync(dbf);
    fs.writeFileSync(dbf, data.subarray(0, 70));
    assert.throws(() => validateShapefile(shp, dbf), /truncated DBF/);
    data.writeUInt32LE(0, 4); fs.writeFileSync(dbf, data);
    assert.throws(() => validateShapefile(shp, dbf), /Empty/);
});
