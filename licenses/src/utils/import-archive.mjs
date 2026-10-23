import fs from 'fs';
import { createHash } from 'node:crypto';
import { assertFreshANMReceipt } from './anm-freshness.mjs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import http from 'http';
import https from 'https';
import AdmZip from 'adm-zip';

const pipe = promisify(pipeline);
const crcTable = Array.from({ length: 256 }, (_, n) => {
    for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
});
const crc32 = bytes => {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
};

const openResponse = (uri, redirects = 0) => new Promise((resolve, reject) => {
    const url = new URL(uri);
    if (!['http:', 'https:'].includes(url.protocol)) return reject(new Error('Unsupported download protocol'));
    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(url, {
        timeout: 120000,
        headers: { 'User-Agent': 'AmazoniaMinada/1.0 (+https://minada.infoamazonia.org)' }
    }, response => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
            response.resume();
            const next = new URL(response.headers.location, url);
            if (redirects >= 5 || (url.protocol === 'https:' && next.protocol !== 'https:')) {
                return reject(new Error('Unsafe or excessive download redirects'));
            }
            return resolve(openResponse(next.href, redirects + 1));
        }
        if (response.statusCode !== 200) {
            response.resume();
            return reject(new Error(`Archive download failed: HTTP ${response.statusCode}`));
        }
        resolve(response);
    });
    req.on('timeout', () => req.destroy(new Error('Archive download timed out')));
    req.on('error', reject);
});

// Never replace an existing download with a partial response or an HTTP error page.
export async function downloadArchive(uri, destination, { requireFreshANM = false } = {}) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const partial = `${destination}.part`;
    try {
        const response = await openResponse(uri);
        let receipt;
        try {
            if (requireFreshANM) receipt = assertFreshANMReceipt(response.headers);
        } catch (error) {
            response.destroy();
            throw error;
        }
        await pipe(response, fs.createWriteStream(partial));
        const size = fs.statSync(partial).size;
        const expected = response.headers['content-length'];
        if (!response.complete || !size || (expected !== undefined && size !== Number(expected))) {
            throw new Error('Archive download incomplete');
        }
        if (receipt) {
            const hash = createHash('sha256');
            for await (const chunk of fs.createReadStream(partial)) hash.update(chunk);
            if (size !== receipt.bytes || hash.digest('hex') !== receipt.sha256) {
                throw new Error('ANM ZIP does not match Azure validation receipt');
            }
        }
        fs.renameSync(partial, destination);
        return receipt;
    } finally {
        fs.rmSync(partial, { force: true });
    }
}

// Check the central-directory CRC ourselves: older adm-zip versions skip it for data descriptors.
export function extractValidatedArchive(archive, destination, required = []) {
    const zip = new AdmZip(archive);
    const entries = zip.getEntries();
    const names = new Set();
    let total = 0;
    for (const entry of entries) {
        const name = entry.entryName;
        if (name.includes('\\') || path.posix.isAbsolute(name) || name.split('/').includes('..') || names.has(name)) {
            throw new Error(`Unsafe or duplicate ZIP entry: ${name}`);
        }
        names.add(name);
        total += entry.header.size;
        if (total > 4 * 1024 ** 3 || entries.length > 10000) throw new Error('ZIP exceeds extraction limits');
    }
    for (const name of required) {
        const entry = zip.getEntry(name);
        if (!entry || entry.isDirectory || !entry.header.size) throw new Error(`ZIP missing required file: ${name}`);
    }
    // Only temporary files are written here. The active collection and cached files remain untouched.
    for (const entry of entries) {
        if (entry.isDirectory) continue;
        const data = entry.getData();
        if (data.length !== entry.header.size || crc32(data) !== (entry.header.crc >>> 0)) {
            throw new Error(`Invalid ZIP size or CRC: ${entry.entryName}`);
        }
        const target = path.join(destination, entry.entryName);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, data);
    }
}

export function validateShapefile(shp, dbf) {
    const shape = fs.readFileSync(shp);
    const table = fs.readFileSync(dbf);
    if (shape.length < 100 || shape.readInt32BE(0) !== 9994 || shape.readInt32LE(28) !== 1000 ||
        shape.readInt32BE(24) * 2 !== shape.length) throw new Error('Invalid or truncated SHP');
    if (table.length < 33) throw new Error('Invalid DBF');
    const records = table.readUInt32LE(4);
    const header = table.readUInt16LE(8);
    const recordSize = table.readUInt16LE(10);
    if (!records || header < 33 || !recordSize || header > table.length || table[header - 1] !== 13 ||
        header + records * recordSize > table.length) throw new Error('Empty or truncated DBF');
    return records;
}
