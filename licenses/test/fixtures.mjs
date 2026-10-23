import AdmZip from 'adm-zip';

export function shapeBuffers(count = 2) {
    const shp = Buffer.alloc(100 + count * 28);
    shp.writeInt32BE(9994, 0);
    shp.writeInt32BE(shp.length / 2, 24);
    shp.writeInt32LE(1000, 28);
    shp.writeInt32LE(1, 32);
    for (let i = 0; i < count; i++) {
        const offset = 100 + i * 28;
        shp.writeInt32BE(i + 1, offset);
        shp.writeInt32BE(10, offset + 4);
        shp.writeInt32LE(1, offset + 8);
        shp.writeDoubleLE(-60 + i / 10, offset + 12);
        shp.writeDoubleLE(-5, offset + 20);
    }
    const dbf = Buffer.alloc(65 + count * 11 + 1, 32);
    dbf.fill(0, 0, 65);
    dbf[0] = 3;
    dbf.writeUInt32LE(count, 4);
    dbf.writeUInt16LE(65, 8);
    dbf.writeUInt16LE(11, 10);
    dbf.write('ID', 32);
    dbf[43] = 'N'.charCodeAt(0);
    dbf[48] = 10;
    dbf[64] = 13;
    for (let i = 0; i < count; i++) dbf.write(String(i + 1).padStart(10), 66 + i * 11);
    dbf[dbf.length - 1] = 26;
    return { shp, dbf };
}

export function archiveBuffer({ count = 2, missing = false, badShape = false, shortRecords = false } = {}) {
    const { shp, dbf } = shapeBuffers(count);
    if (badShape) shp.writeInt32BE(1000000, 24);
    if (shortRecords) {
        // Header and DBF are valid, but the SHP has fewer features than the DBF.
        const shortened = shp.subarray(0, shp.length - 28);
        shortened.writeInt32BE(shortened.length / 2, 24);
        const zip = new AdmZip();
        zip.addFile('BRASIL.shp', shortened);
        zip.addFile('BRASIL.dbf', dbf);
        return zip.toBuffer();
    }
    const zip = new AdmZip();
    zip.addFile('BRASIL.shp', shp);
    if (!missing) zip.addFile('BRASIL.dbf', dbf);
    return zip.toBuffer();
}
