import fs from 'fs';
import path from 'path';
import { fileManager } from '../config.mjs';
import { download, loadLocal, unzip, read, makeTmp, removeTmp, cpFiles } from '../utils/file-manager.mjs';
import { validateShapefile } from '../utils/import-archive.mjs';
import { getLogger } from '../utils/logging.mjs';

// A separate indexed collection works on standalone MongoDB too. No live data is deleted
// until the entire input has been parsed and loaded; renameCollection is the commit point.
export async function importShapefile(source, Model, { local = false, transform = value => value } = {}) {
    const db = Model.db.db;
    const activeName = Model.collection.collectionName;
    const stagingName = `${activeName}_importing`;
    // A unique lock prevents simultaneous runs from sharing temporary files.
    // After a process crash, leave the staging collection for inspection, rather than
    // allowing another worker to remove an import which may still be running.
    const locks = db.collection('import_locks');
    await locks.insertOne({ _id: activeName, staging: stagingName, startedAt: new Date() });
    let staging;

    let promoted = false;
    let copied = false;
    const cached = [];
    try {
        if (await db.listCollections({ name: stagingName }).hasNext()) {
            throw new Error(`Staging collection already exists: ${stagingName}; inspect it before retrying`);
        }
        staging = await db.createCollection(stagingName);
        removeTmp(source.output);
        makeTmp(source.output);
        const required = [source.shapefile, source.dbf].map(file => path.posix.join(source.unziped_folder, file));
        await (local ? loadLocal : download)(source.uri, source.output, source.zipfile);
        await unzip(source.output, source.zipfile, required);
        const extracted = path.join(source.output, 'tmp', source.unziped_folder);
        const records = validateShapefile(
            path.resolve(fileManager.storagePath(), extracted, source.shapefile),
            path.resolve(fileManager.storagePath(), extracted, source.dbf)
        );
        for (const [keys, options] of Model.schema.indexes()) await staging.createIndex(keys, options);
        let seen = 0, inserted = 0, rejectedGeometry = 0;
        await read(extracted, source.shapefile, source.encoding, async value => {
            seen++;
            const document = new Model(transform(value));
            await document.validate();
            try {
                await staging.insertOne(document.toObject());
                inserted++;
            } catch (error) {
                // ANM includes some invalid polygons. Keep the established exclusion,
                // but count it explicitly; database, schema and write errors must fail.
                if (error.code === 16755 || (error.code === 2 && /geo|polygon|ring|coordinate/i.test(error.message))) {
                    rejectedGeometry++;
                } else throw error;
            }
        });
        if (seen !== records || inserted === 0) {
            throw new Error(`Incomplete shapefile import: expected=${records}, read=${seen}, inserted=${inserted}`);
        }
        // Prepare the cache only after a complete, successful staging import. Restore
        // its previous files if copying or the atomic collection promotion fails.
        for (const file of [source.shapefile, source.dbf]) {
            const target = path.resolve(fileManager.storagePath(), source.output, file);
            const backup = path.resolve(fileManager.storagePath(), source.output, 'tmp', `${file}.previous`);
            const existed = fs.existsSync(target);
            if (existed) fs.copyFileSync(target, backup);
            cached.push({ target, backup, existed });
        }
        copied = true;
        cpFiles(source);
        await staging.rename(activeName, { dropTarget: true });
        promoted = true;
        const result = { records: seen, inserted, rejectedGeometry };
        getLogger().info(`Import committed for ${activeName}: ${JSON.stringify(result)}`);
        return result;
    } finally {
        if (!promoted && copied) {
            for (const { target, backup, existed } of cached) {
                if (existed) fs.copyFileSync(backup, target);
                else fs.rmSync(target, { force: true });
            }
        }
        if (staging && !promoted) await db.collection(stagingName).drop();
        if (staging) removeTmp(source.output);
        await locks.deleteOne({ _id: activeName });
    }
}
