import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {validateProject} from '../src/project-document.js';
const doc={version:1,name:'Prova a 60 km/h',notes:'Confronto',settings:{type:'ice',selected:'pistons',scenario:'mixed',speed:60,load:50,ambient:20,cooling:true,section:true,car:false,explode:20,brightness:25,parts:{pistons:{offset:[1,0,0],detached:true}}}};
test('Configurazioni: roundtrip completo, velocità e parti validate',()=>{
 assert.deepEqual(validateProject(doc),doc);
 for(const settings of [{...doc.settings,speed:101},{...doc.settings,selected:'battery'},{...doc.settings,type:'__proto__'},{...doc.settings,parts:{pistons:{detached:false,offset:[Infinity,0,0]}}}])assert.throws(()=>validateProject({...doc,settings}));
 assert.throws(()=>validateProject({...doc,notes:'x'.repeat(2001)}));
});
test('Archivio engineLab: isolamento account, anonimi, scritture dirette e conflitti',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');`);
 await db.exec(await readFile(new URL('../supabase/engine.sql',import.meta.url),'utf8'));
 const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',save=(rev,p=doc)=>db.query('select public.save_engine_project($1,$2,$3) as revision',[id,rev,JSON.stringify(p)]);
 await db.exec('set role anon');await assert.rejects(()=>db.query('select * from public.engine_projects'));await assert.rejects(()=>save(0));
 await db.exec("reset role;set role authenticated;set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'");
 assert.equal((await save(0)).rows[0].revision,1);assert.equal((await save(1)).rows[0].revision,2);await assert.rejects(()=>save(1),/conflict/i);
 await assert.rejects(()=>db.query("update public.engine_projects set name='bypass'"));
 await assert.rejects(()=>save(2,{...doc,settings:{...doc.settings,speed:101}}),/Invalid engine project/);
 await assert.rejects(()=>save(2,{...doc,settings:{...doc.settings,load:null}}),/Invalid engine project/);
 await db.exec("set request.jwt.claim.sub='22222222-2222-2222-2222-222222222222'");
 assert.equal((await db.query('select * from public.engine_projects')).rows.length,0);await assert.rejects(()=>save(2),/conflict/i);await assert.rejects(()=>save(0));
 await db.exec("set request.jwt.claim.sub='11111111-1111-1111-1111-111111111111'");assert.equal((await db.query('select revision from public.engine_projects')).rows[0].revision,2);
 }finally{await db.close();}
});
