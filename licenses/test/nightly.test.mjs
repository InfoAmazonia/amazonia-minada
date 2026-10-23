import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { assertFreshANMReceipt } from '../src/utils/anm-freshness.mjs';
import { runANMPipeline } from '../src/utils/anm-pipeline.mjs';
import { downloadArchive } from '../src/utils/import-archive.mjs';

const receipt = () => ({'x-anm-downloaded-at':'2026-10-23T03:00:00Z','x-anm-validated-at':'2026-10-23T03:01:00Z','x-anm-sha256':'a'.repeat(64),'x-anm-bytes':'128'});
const now = new Date('2026-10-23T03:30:00Z');
for (const bad of ['missing','yesterday','future','order','sha','bytes']) test(`reject ${bad} source receipt`,()=>{
 const h=receipt();if(bad==='missing')delete h['x-anm-validated-at'];
 if(bad==='yesterday')h['x-anm-downloaded-at']='2026-10-23T02:59:59Z';
 if(bad==='future')h['x-anm-validated-at']='2026-10-24T03:00:00Z';
 if(bad==='order')h['x-anm-downloaded-at']='2026-10-23T03:02:00Z';
 if(bad==='sha')h['x-anm-sha256']='invalid';if(bad==='bytes')h['x-anm-bytes']='0';
 assert.throws(()=>assertFreshANMReceipt(h,now));
});
test('accept current Brasilia day across UTC boundary',()=>{
 assert.equal(assertFreshANMReceipt(receipt(),now).bytes,128);
 const h=receipt();h['x-anm-downloaded-at']='2026-10-23T23:00:00Z';h['x-anm-validated-at']='2026-10-23T23:01:00Z';
 assert.doesNotThrow(()=>assertFreshANMReceipt(h,new Date('2026-10-24T02:30:00Z')));
 assert.throws(()=>assertFreshANMReceipt(h,new Date('2026-10-24T03:00:00Z')));
});
for(const fail of ['UC','TI',null])test(`pipeline ordering and ${fail||'success'}`,async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'anm-pipeline-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const steps=[],lockPath=path.join(dir,'lock');
 const run=()=>runANMPipeline({lockPath,updateUC:async()=>{steps.push('UC');if(fail==='UC')throw Error('invalid source');},updateTI:async()=>{steps.push('TI');if(fail==='TI')throw Error('publish failed');}});
 if(fail)await assert.rejects(run());else await run();
 assert.deepEqual(steps,fail==='UC'?['UC']:['UC','TI']);assert.equal(fs.existsSync(lockPath),false);
});
test('overlap or crash lock blocks the entire pipeline',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'anm-pipeline-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const lockPath=path.join(dir,'lock');fs.writeFileSync(lockPath,'old worker');let called=false;
 await assert.rejects(runANMPipeline({lockPath,updateUC:async()=>{called=true;},updateTI:async()=>{called=true;}}),/EEXIST/);
 assert.equal(called,false);assert.equal(fs.readFileSync(lockPath,'utf8'),'old worker');
});
for(const mode of ['valid','missing','stale','mismatch'])test(`HTTP archive receipt ${mode}`,async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'anm-download-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'zip');fs.writeFileSync(file,'old ZIP');const body=Buffer.from('test bytes');
 const server=http.createServer((_,res)=>{
   if(mode!=='missing'){
     res.setHeader('X-ANM-Downloaded-At',mode==='stale'?'2020-01-01T03:00:00Z':new Date().toISOString());
     res.setHeader('X-ANM-Validated-At',new Date().toISOString());res.setHeader('X-ANM-Bytes',body.length);
     res.setHeader('X-ANM-SHA256',mode==='mismatch'?'b'.repeat(64):createHash('sha256').update(body).digest('hex'));
   }res.end(body);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const run=()=>downloadArchive(`http://127.0.0.1:${server.address().port}/file`,file,{requireFreshANM:true});
 if(mode==='valid'){await run();assert.equal(fs.readFileSync(file,'utf8'),'test bytes');}
 else{await assert.rejects(run());assert.equal(fs.readFileSync(file,'utf8'),'old ZIP');}
 assert.equal(fs.existsSync(file+'.part'),false);
});

test('only one nightly data job is scheduled and both reusable stages load',async()=>{
 const {jobs}=await import('../src/job.config.mjs');
 assert.equal(jobs.filter(j=>j.name==='UpdateANMPipeline').length,1);
 assert.equal(jobs.some(j=>['UpdateInvasions','UpdateReserveInvasions'].includes(j.name)),false);
 const {runUpdateInvasions}=await import('../src/core/UpdateInvasions.mjs');
 const {runUpdateReserveInvasions}=await import('../src/core/UpdateReserveInvasions.mjs');
 assert.equal(typeof runUpdateInvasions,'function');assert.equal(typeof runUpdateReserveInvasions,'function');
});
