import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
test('orders, admin, prices, retries and reports',async()=>{const dir=mkdtempSync(path.join(tmpdir(),'primo-test-'));const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PRIMO_DATA_DIR:dir,PRIMO_PRINT_MODE:'disabled',PORT:'3099'},stdio:['ignore','pipe','pipe']});try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',()=>reject(Error('Server exited')));});let cookie='';async function api(route,body){const r=await fetch('http://127.0.0.1:3099/api/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',cookie},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};}
assert.equal((await api('products')).status,401);await api('setup',{password:'primo-test-password'});cookie=(await api('login',{password:'primo-test-password'})).cookie.split(';')[0];const payload={key:randomUUID(),name:'Carlos',items:[{id:1,qty:2,options:['Aguacate','Cebolla']}]};const a=await api('orders',payload);assert.equal(a.status,201);assert.equal(a.data.total,700);assert.equal(a.data.number,1);assert.equal(a.data.printing.status,'queued');assert.equal((await api('orders',payload)).data.printing.id,a.data.printing.id);assert.equal((await api('reprint',{id:a.data.id})).status,400);assert.equal((await api('orders',payload)).data.id,a.data.id);assert.equal((await api('orders',{...payload,key:randomUUID(),items:[{id:1,qty:1,options:['Inventado']}]})).status,400);
const concurrent=await Promise.all(Array.from({length:8},()=>api('orders',{...payload,key:randomUUID()})));assert.equal(new Set(concurrent.map(r=>r.data.number)).size,8);
await api('products',{id:1,name:'Taco asada',category:'Tacos',price:500,available:true,options:[{name:'Aguacate',price:100}]});assert.equal((await api('orders')).data.find(o=>o.id===a.data.id).total,700);await api('cancel',{id:a.data.id,reason:'Prueba'});assert.equal((await api('orders')).data.find(o=>o.id===a.data.id).cancel_reason,'Prueba');assert.equal((await api('orders',{...payload,key:randomUUID(),items:[{id:1,qty:1,options:[]}]})).data.number,10);
}finally{child.kill();await new Promise(r=>child.once('exit',r));rmSync(dir,{recursive:true,force:true});}});


