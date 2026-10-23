import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

for (const worker of [false, true]) {
    test(`jobEntrypoint signals failure in ${worker ? 'Bree-style worker' : 'CLI'}`, { skip: !process.env.MONGO_TEST_URI }, () => {
        const uri = new URL(process.env.MONGO_TEST_URI);
        uri.pathname = `/minada_import_job_test_${Date.now()}`;
        const module = new URL('../src/startup.mjs', import.meta.url).href;
        const job = `import(${JSON.stringify(module)}).then(({ jobEntrypoint }) => jobEntrypoint(async () => {
            throw new Error('expected ZIP validation failure');
        }));`;
        const script = worker ? `
            import { Worker } from 'node:worker_threads';
            const worker = new Worker(${JSON.stringify(job)}, { eval: true });
            worker.on('exit', code => process.exit(code));
        ` : job;
        const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
            env: { ...process.env, MONGO_URI: uri.href }, encoding: 'utf8', timeout: 15000
        });
        assert.equal(child.status, 1, child.stdout + child.stderr);
        assert.match(child.stdout + child.stderr, /expected ZIP validation failure/);
        assert.doesNotMatch(child.stdout, /ICFG Job finished/);
    });
}
