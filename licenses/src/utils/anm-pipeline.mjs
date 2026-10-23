import fs from 'node:fs/promises';
import path from 'node:path';

export async function runANMPipeline({ updateUC, updateTI, lockPath }) {
    await fs.mkdir(path.dirname(lockPath), { recursive: true });
    // Exclusive lock spans the entire route, including UC and TI publication.
    // On a crash retain it for operator inspection instead of overlapping a surviving worker.
    const lock = await fs.open(lockPath, 'wx', 0o600);
    try {
        await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
        await updateUC();
        await updateTI();
    } finally {
        await lock.close();
        await fs.unlink(lockPath);
    }
}
