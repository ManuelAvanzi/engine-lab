import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,systems,scenarios} from '../src/data.js';
import {handleRequest} from '../src/worker.js';
import {motionStep,ratios,drivetrain,slowMotion} from '../src/motion.js';
const base={scenario:'mixed',rpm:2800,load:50,ambient:20,cooling:true};
test('La riduzione conserva il rapporto e il rallentamento su tutto il regime',()=>{
 for(const type of Object.keys(ratios))for(const rpm of [800,2800,6000,14000]){
  const step=motionStep(type,{playing:true,assembled:true,rpm,rate:1},.02);
  assert.ok(Math.abs(step.engine/.02*60/(2*Math.PI)*slowMotion-rpm)<1e-9);
  assert.ok(Math.abs(step.wheels/.02*60/(2*Math.PI)*slowMotion-drivetrain(type,rpm).wheelRpm)<1e-9);
 }
 assert.equal(drivetrain('ice',2800).wheelRpm,560);
});
test('Motore, ruote e impulsi condividono pausa e rapporto; parti separate fermano la trasmissione',()=>{
 for(const type of Object.keys(ratios)){
  const run=motionStep(type,{playing:true,assembled:true,rpm:2800,rate:1},.02);
  assert.ok(run.engine>0&&run.flow>0);assert.equal(run.engine/run.wheels,ratios[type]);
  assert.deepEqual(motionStep(type,{playing:false,assembled:true},.02),{engine:0,wheels:0,flow:0});
  const open=motionStep(type,{playing:true,assembled:false},.02);assert.ok(open.engine>0);assert.equal(open.wheels,0);assert.equal(open.flow,0);
  const faster=motionStep(type,{playing:true,assembled:true,rpm:5600,rate:1},.02);assert.ok(faster.wheels>run.wheels);
 }
});
test('La conversione conserva il bilancio energetico per tutti gli scenari',()=>{
 for(const system of Object.keys(systems))for(const scenario of Object.keys(scenarios))for(const load of [10,50,100]){
  const m=simulate(system,{...base,scenario,load});
  assert.ok(m.efficiency>0&&m.efficiency<100);assert.equal(m.efficiency+m.loss,100);
  assert.ok(Number.isFinite(m.energy)&&m.energy>0);assert.ok(Number.isFinite(m.torque));
  if(system==='ev'){assert.equal(m.co2,0);assert.equal(m.consumption,m.energy);}else assert.ok(Math.abs(m.consumption*8.9-m.energy)<1e-8);
 }
});
test('La perdita del raffreddamento aumenta la temperatura e riduce la potenza',()=>{
 for(const system of Object.keys(systems)){const normal=simulate(system,base),fault=simulate(system,{...base,cooling:false});assert.ok(fault.temperature>normal.temperature);assert.ok(fault.power<normal.power);assert.ok(fault.efficiency<normal.efficiency);assert.equal(fault.warning,true);}
});
test('Il tutor espone il proprio stato e non finge una risposta AI senza configurazione',async()=>{
 const status=await handleRequest(new Request('https://lab.example/api/tutor/status'));assert.deepEqual(await status.json(),{available:false,mode:'guided'});
 const response=await handleRequest(new Request('https://lab.example/api/tutor',{method:'POST',body:'{}'}));assert.equal(response.status,503);
});
test('Il tutor rifiuta richieste da altre origini e parametri invalidi',async()=>{
 const cross=await handleRequest(new Request('https://lab.example/api/tutor',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'}),{OPENAI_API_KEY:'test-not-a-real-key'});assert.equal(cross.status,403);
 const invalid=await handleRequest(new Request('https://lab.example/api/tutor',{method:'POST',body:JSON.stringify({question:'Spiega',system:'ice',component:'stator'})}),{OPENAI_API_KEY:'test-not-a-real-key'});assert.equal(invalid.status,400);
});
test('Il server risponde 404 alle risorse sconosciute e serve soltanto gli asset dichiarati',async()=>{
 const missing=await handleRequest(new Request('https://lab.example/.env'));assert.equal(missing.status,404);
 const home=await handleRequest(new Request('https://lab.example/'),{},{'/index.html':{type:'text/html',body:'<h1>Laboratorio</h1>'}});assert.equal(home.status,200);assert.match(await home.text(),/Laboratorio/);
});
