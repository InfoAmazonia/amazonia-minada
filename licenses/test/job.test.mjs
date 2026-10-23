import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { runJob } from '../src/utils/run-job.mjs';

for (const failure of ['connect', 'import', 'disconnect', null]) {
    test(`job status for ${failure || 'success'}`, async () => {
        const messages = [], steps = [];
        const code = await runJob(async () => {
            steps.push('import');
            if (failure === 'import') throw new Error('invalid ZIP');
            steps.push('publish');
        }, {
            connect: async () => { if (failure === 'connect') throw new Error('no database'); },
            disconnect: async () => { steps.push('disconnect'); if (failure === 'disconnect') throw new Error('disconnect failed'); },
            logger: { error: message => messages.push(message), info: message => messages.push(message) }
        });
        assert.equal(code, failure ? 1 : 0);
        assert.equal(messages.some(value => value.includes('Job finished.')), !failure);
        assert.equal(steps.includes('disconnect'), true);
        if (['connect', 'import'].includes(failure)) assert.equal(steps.includes('publish'), false);
    });
}

test('failed job produces a nonzero process exit', () => {
    const module = new URL('../src/utils/run-job.mjs', import.meta.url).href;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
        import { runJob } from ${JSON.stringify(module)};
        process.exit(await runJob(async () => { throw Error('invalid ZIP'); }, {
            connect: async () => {}, disconnect: async () => {}, logger: console
        }));
    `], { encoding: 'utf8' });
    assert.equal(child.status, 1);
    assert.match(child.stderr, /invalid ZIP/);
    assert.doesNotMatch(child.stdout, /Job finished/);
});
