import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import http from 'http';
import mongoose from 'mongoose';
import { importShapefile } from '../src/core/import-shapefile.mjs';
import { archiveBuffer } from './fixtures.mjs';

// The test always overrides dbName; it never imports into the database named in the URI.
test('MongoDB staging and atomic promotion', { skip: !process.env.MONGO_TEST_URI }, async t => {
    const dbName = `minada_import_test_${Date.now()}`;
    await mongoose.connect(process.env.MONGO_TEST_URI, { dbName, serverSelectionTimeoutMS: 10000, autoIndex: false });
    const schema = new mongoose.Schema({ type: String, properties: {}, geometry: {} });
    schema.index({ geometry: '2dsphere' });
    schema.index({ 'properties.ID': 1 });
    const Model = mongoose.model('ImportSafetyTest', schema, 'licenses');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minada-import-'));
    let bytes, status;
    const server = http.createServer((_, res) => { res.statusCode = status; res.end(bytes); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(async () => {
        await new Promise(resolve => server.close(resolve));
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        fs.rmSync(dir, { recursive: true, force: true });
    });
    globalThis.GlobalLogger = { info() {}, error() {} };
    const source = {
        uri: `http://127.0.0.1:${server.address().port}/BRASIL.zip`, output: dir,
        zipfile: 'BRASIL.zip', unziped_folder: '', shapefile: 'BRASIL.shp', dbf: 'BRASIL.dbf', encoding: 'utf8'
    };
    const baseline = async () => {
        await Model.deleteMany({});
        await Model.create({ type: 'Feature', properties: { ID: 'previous' } });
        fs.writeFileSync(path.join(dir, 'BRASIL.shp'), 'old SHP');
        fs.writeFileSync(path.join(dir, 'BRASIL.dbf'), 'old DBF');
        bytes = archiveBuffer(); status = 200;
    };
    const preserved = async () => {
        assert.equal(await Model.countDocuments(), 1);
        assert.equal((await Model.findOne()).properties.ID, 'previous');
        assert.equal(fs.readFileSync(path.join(dir, 'BRASIL.shp'), 'utf8'), 'old SHP');
        assert.equal(fs.readFileSync(path.join(dir, 'BRASIL.dbf'), 'utf8'), 'old DBF');
        assert.equal(await mongoose.connection.db.listCollections({ name: 'licenses_importing' }).hasNext(), false);
        assert.equal(await mongoose.connection.db.collection('import_locks').countDocuments(), 0);
    };
    for (const kind of ['403', 'html', 'missing', 'bad-shape', 'parse', 'write', 'empty', 'short-records', 'rename']) {
        await t.test(`preserve live collection and cache on ${kind} failure`, async () => {
            await baseline();
            if (kind === '403') status = 403;
            if (kind === 'html') bytes = Buffer.from('<html>Forbidden</html>');
            if (kind === 'missing') bytes = archiveBuffer({ missing: true });
            if (kind === 'bad-shape') bytes = archiveBuffer({ badShape: true });
            if (kind === 'short-records') bytes = archiveBuffer({ shortRecords: true });
            let seen = 0;
            const duplicateId = new mongoose.Types.ObjectId();
            const options = { transform: value => {
                if (kind === 'parse' && ++seen === 2) throw new Error('simulated parser failure');
                if (kind === 'write') value._id = duplicateId;
                if (kind === 'empty') value.geometry = { type: 'Point', coordinates: [9999, 9999] };
                return value;
            } };
            let candidate = Model;
            if (kind === 'rename') {
                candidate = function(value) { return new Model(value); };
                candidate.schema = Model.schema;
                candidate.collection = Model.collection;
                candidate.db = { db: new Proxy(mongoose.connection.db, {
                    get(target, name) {
                        if (name === 'createCollection') return async (...args) => {
                            const collection = await target.createCollection(...args);
                            collection.rename = async () => { throw new Error('simulated promotion failure'); };
                            return collection;
                        };
                        const value = target[name];
                        return typeof value === 'function' ? value.bind(target) : value;
                    }
                }) };
            }
            await assert.rejects(importShapefile(source, candidate, options));
            await preserved();
        });
    }
    await t.test('concurrent import cannot remove another worker staging data', async () => {
        await baseline();
        const db = mongoose.connection.db;
        await db.collection('import_locks').insertOne({ _id: 'licenses' });
        await db.createCollection('licenses_importing');
        await db.collection('licenses_importing').insertOne({ keep: true });
        await assert.rejects(importShapefile(source, Model), /duplicate key/i);
        assert.equal(await db.collection('licenses_importing').countDocuments(), 1);
        assert.equal(await Model.countDocuments(), 1);
        await db.collection('licenses_importing').drop();
        await db.collection('import_locks').deleteMany({});
    });
    await t.test('valid complete input replaces data, retains indexes and updates cache', async () => {
        await baseline();
        assert.deepEqual(await importShapefile(source, Model), { records: 2, inserted: 2, rejectedGeometry: 0 });
        assert.equal(await Model.countDocuments(), 2);
        assert.equal(await Model.countDocuments({ 'properties.ID': 'previous' }), 0);
        const indexes = await Model.collection.indexes();
        assert.ok(indexes.some(index => index.key.geometry === '2dsphere'));
        assert.ok(indexes.some(index => index.key['properties.ID'] === 1));
        assert.equal(fs.readFileSync(path.join(dir, 'BRASIL.shp')).readInt32BE(0), 9994);
    });
    await t.test('invalid ANM geometry is counted while valid data is promoted', async () => {
        await baseline();
        const result = await importShapefile(source, Model, { transform: value => {
            if (value.properties.ID === 1) value.geometry.coordinates = [9999, 9999];
            return value;
        } });
        assert.deepEqual(result, { records: 2, inserted: 1, rejectedGeometry: 1 });
        assert.equal(await Model.countDocuments(), 1);
    });
});
