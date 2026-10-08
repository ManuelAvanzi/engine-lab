import {refineElectricSystems} from '../src/electric-detail.js';
import {refineTechnicalEngine} from '../src/technical-engine.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,systems,scenarios} from '../src/data.js';
import {handleRequest} from '../src/worker.js';
import {motionStep,ratios,drivetrain,slowMotion} from '../src/motion.js';
test('La home e il laboratorio hanno route distinte; i link ai propulsori conservano la pagina 3D',async()=>{
 const assets={'/index.html':{body:'engineLab home',type:'text/html'},'/lab.html':{body:'engineLab laboratorio',type:'text/html'}};
 assert.equal(await (await handleRequest(new Request('https://lab.example/'),{},assets)).text(),'engineLab home');
 for(const path of ['/lab','/lab/','/lab?system=ice','/lab?system=hybrid','/lab?system=ev']){
  const response=await handleRequest(new Request('https://lab.example'+path),{},assets);
  assert.equal(response.status,200);assert.equal(await response.text(),'engineLab laboratorio');
 }
 const head=await handleRequest(new Request('https://lab.example/lab',{method:'HEAD'}),{},assets);
 assert.equal(head.status,200);assert.equal(await head.text(),'');
 assert.equal((await handleRequest(new Request('https://lab.example/missing'),{},assets)).status,404);
});
const base={scenario:'mixed',rpm:2800,load:50,ambient:20,cooling:true};
test('I dati istantanei rispettano le conversioni di consumo, CO2 e potenza da 1 a 100 km/h',()=>{
 for(const type of Object.keys(systems))for(const scenario of Object.keys(scenarios))for(const speed of [1,38,50,100])for(const elapsed of [0,33,600]){
  const m=new LiveSimulation(type,20).step({...base,type,scenario,speed,playing:true,assembled:true},elapsed);
  const rate=m.per100*speed/100;
  assert.ok(Math.abs((type==='ev'?m.inputKw:m.litersHour)-rate)<1e-10);
  assert.ok(Math.abs(m.powerKw-m.inputKw*m.efficiency/100)<1e-10);
  if(type==='ev'){assert.equal(m.co2Second,0);assert.equal(m.co2Km,0);}
  else{
   assert.ok(Math.abs(m.co2Second-m.litersHour*2350/3600)<1e-10);
   assert.ok(Math.abs(m.co2Km-m.co2Second*3600/speed)<1e-10);
   assert.ok(Math.abs(m.per100*m.kmPerLiter-100)<1e-10);
  }
 }
});
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
import * as THREE from 'three';
import {PowertrainViewer} from '../src/model.js';
import {addInsideDetails,insideNotes} from '../src/inside.js';
test('Ogni parte si ispeziona e torna alla superficie senza alterare esplosione o geometria',()=>{
 for(const type of Object.keys(systems)){
  const v=Object.create(PowertrainViewer.prototype);
  Object.assign(v,{type,root:new THREE.Group(),parts:{},meshes:[],pistons:[],rods:[],rotating:[],valves:[],chambers:[],section:true,insideOpacity:.16,insideId:null,selected:null,targetExplosion:.8});
  if(type==='ev')v.electric();else{v.engine(false);if(type==='hybrid')v.hybrid();}
  refineTechnicalEngine(v);refineElectricSystems(v);
  if(type==='ice'){assert.equal(v.camshafts.length,2);assert.equal(v.valves.length,8);assert.deepEqual(v.timingWheels.map(w=>w.ratio),[1,.5,.5]);}
  addInsideDetails(v);
  for(const id of systems[type].components){
   assert.ok(insideNotes[id]?.every(Boolean),id);
   v.selected=id;v.paint();const rest=v.meshes.map(m=>[m.material.opacity,m.material.transparent,m.material.depthWrite,m.visible]);
   const previousSelection=v.selected;
   const hovered=systems[type].components.find(k=>k!==id);
   v.setHover(hovered);
   assert.equal(v.selected,previousSelection);
   assert.ok(Object.values(v.parts).every(p=>p.visible));
   assert.equal(v.parts[hovered].insideGroup.visible,true);
   assert.equal(v.targetExplosion,.8);
   v.setHover(null);
   assert.deepEqual(v.meshes.map(m=>[m.material.opacity,m.material.transparent,m.material.depthWrite,m.visible]),rest);
   const position=v.parts[id].position.clone();v.setInside(true);
   assert.equal(v.parts[id].insideGroup.visible,true);
   assert.ok(v.meshes.some(m=>m.userData.part===id&&m.material.opacity<1));
   assert.ok(Object.entries(v.parts).every(([k,p])=>p.visible===(k===id)));
   assert.equal(v.targetExplosion,.8);assert.ok(v.parts[id].position.equals(position));
   assert.doesNotThrow(()=>v.root.clone(true));
   v.setInside(false);assert.equal(v.parts[id].insideGroup.visible,false);
   assert.deepEqual(v.meshes.map(m=>[m.material.opacity,m.material.transparent,m.material.depthWrite,m.visible]),rest);
  }
 }
});

import {roadMotion,wheelDiameter,speedFromRpm} from '../src/motion.js';
import {LiveSimulation} from '../src/live-simulation.js';
import {co2PerLiter} from '../src/data.js';
import {makeExperiment,motionLesson} from '../src/learning.js';
test('Confronti: ogni sistema usa il proprio rapporto alla stessa velocità, anche con rpm estranei',()=>{
 for(const speed of [1,40,80,100])for(const type of Object.keys(systems)){
  const expected=simulate(type,{...base,speed,rpm:roadMotion(type,speed).rpm});
  assert.deepEqual(simulate(type,{...base,speed,rpm:99999}),expected);
  assert.equal(expected.rpm,roadMotion(type,speed).rpm);
  assert.ok(Math.abs(expected.powerRequired-expected.energy*expected.efficiency/100*speed/100)<1e-10);
 }
});
test('A zero i valori per distanza sono indefiniti e non vengono mostrati consumi o temperature di marcia',()=>{
 for(const type of Object.keys(systems)){
  const m=simulate(type,{...base,speed:0,cooling:false});
  assert.equal(m.energy,null);assert.equal(m.consumption,null);assert.equal(m.co2,null);
  assert.equal(m.power,0);assert.equal(m.torque,0);assert.equal(m.efficiency,0);assert.equal(m.temperature,20);
 }
});
test('Le tre indagini guidate conservano le variabili controllate e verificano le previsioni per ogni sistema',()=>{
 assert.ok(motionLesson.speed>0);assert.equal(motionLesson.playing,true);
 for(const type of Object.keys(systems))for(const scenario of Object.keys(scenarios))for(const load of [10,50,100])for(const ambient of [-10,20,45]){
  const c={...base,scenario,load,ambient};
  const motion=makeExperiment(type,c,'motion');assert.equal(motion.after.rpm,2*motion.before.rpm);
  const energy=makeExperiment(type,c,'energy');assert.ok(energy.after.consumption>energy.before.consumption);
  if(type==='ev')assert.equal(energy.after.co2,0);else assert.ok(energy.after.co2>energy.before.co2);
  const cooling=makeExperiment(type,c,'cooling');assert.equal(cooling.base.speed,cooling.changed.speed);
  assert.ok(cooling.after.temperature>cooling.before.temperature);assert.ok(cooling.after.power<cooling.before.power);
 }
});
test('Le fonti sono accessibili con route dedicata, slash finale e richiesta HEAD',async()=>{
 const assets={'/fonti.html':{body:'Fonti dei dati e dei parametri',type:'text/html'}};
 for(const path of ['/fonti','/fonti/','/fonti#ipotesi']){
  const res=await handleRequest(new Request('https://lab.example'+path),{},assets);assert.equal(res.status,200);assert.match(await res.text(),/Fonti dei dati/);
 }
 assert.equal(await (await handleRequest(new Request('https://lab.example/fonti',{method:'HEAD'}),{},assets)).text(),'');
});
test('Prova in marcia: bilanci di carburante, CO2 e distanza indipendenti dalla frequenza di aggiornamento',()=>{
 for(const type of Object.keys(systems)){
  const input={...base,type,speed:60,playing:true,assembled:true};
  const coarse=new LiveSimulation(type,20),fine=new LiveSimulation(type,20);
  const a=coarse.step(input,600);let b;for(let i=0;i<2400;i++)b=fine.step(input,.25);
  for(const key of ['distance','fuel','energy','co2','temperature'])assert.ok(Math.abs(a[key]-b[key])<1e-8,`${type} ${key}`);
  assert.ok(Math.abs(a.distance-10)<1e-10);assert.ok(a.temperature>70||type==='ev');
  if(type==='ev'){assert.equal(a.fuel,0);assert.equal(a.co2,0);assert.ok(a.energy>0);}
  else{assert.ok(Math.abs(a.energy-a.fuel*8.9)<1e-10);assert.ok(Math.abs(a.co2-a.fuel*co2PerLiter*1000)<1e-8);assert.ok(Math.abs(a.per100*a.kmPerLiter-100)<1e-10);}
 }
});
test('Pausa, scheda nascosta e trasmissione separata fermano i totali; zero km/h non consuma',()=>{
 const sim=new LiveSimulation('ice',20),input={...base,type:'ice',speed:50,playing:true,assembled:true};
 const first=sim.step(input,30);
 for(const stop of [{playing:false},{hidden:true},{assembled:false},{speed:0}]){
  const next=sim.step({...input,...stop},60);for(const key of ['distance','fuel','energy','co2','seconds'])assert.equal(next[key],first[key]);assert.equal(next.inputKw,0);
 }
 const changed=sim.step({...input,type:'ev'},0);assert.equal(changed.distance,0);assert.equal(changed.energy,0);
 sim.reset('ice',25);assert.equal(sim.temperature,25);assert.equal(sim.seconds,0);
});
test('Velocita, sforzo, riscaldamento e raffreddamento cambiano i parametri in modo esplicabile',()=>{
 const input={...base,type:'ice',speed:50,playing:true,assembled:true};
 const run=(overrides={})=>new LiveSimulation('ice',20).step({...input,...overrides},30);
 assert.ok(run({speed:100}).litersHour>run().litersHour);assert.ok(run({load:90}).powerKw>run({load:10}).powerKw);
 assert.ok(run({cooling:false}).temperature>run().temperature);
 const sim=new LiveSimulation('ice',20),cold=sim.step(input,0),warm=sim.step(input,600);assert.ok(warm.per100<cold.per100);assert.ok(warm.temperature>cold.temperature);
 assert.equal(sim.step({...input,speed:0},0).kmPerLiter,null);
});
test('La rotazione segue il tempo trascorso anche a 10 fps, in tempo reale e al rallentatore',()=>{
 const cadences=[Array(60).fill(1/60),Array(30).fill(1/30),Array(10).fill(.1),[.01,.19,.07,.03,.4,.3]];
 for(const type of Object.keys(ratios))for(const speed of [0,50,100])for(const rate of [3,100])for(const frames of cadences){
  const d=roadMotion(type,speed);
  const total=frames.reduce((sum,dt)=>{
   const step=motionStep(type,{playing:true,assembled:true,rpm:d.rpm,rate},dt);
   return {engine:sum.engine+step.engine,wheels:sum.wheels+step.wheels};
  },{engine:0,wheels:0});
  const expected=(speed/3.6)/(Math.PI*wheelDiameter)*2*Math.PI*rate/slowMotion;
  assert.ok(Math.abs(total.wheels-expected)<1e-10,`${type} ${speed} km/h rate ${rate}`);
  assert.ok(Math.abs(total.engine-expected*ratios[type])<1e-9);
 }
 for(const dt of [-1,NaN,Infinity])assert.equal(motionStep('ice',{playing:true,assembled:true},dt).engine,0);
});
test('Da 0 a 100 km/h ruote e motore mantengono velocita e rapporto coerenti',()=>{
 for(const type of Object.keys(systems))for(const speed of [0,1,50,100]){
  const d=roadMotion(type,speed);
  assert.ok(Math.abs(d.wheelRpm*Math.PI*wheelDiameter/60*3.6-speed)<1e-10);
  assert.equal(d.rpm,d.wheelRpm*ratios[type]);
  assert.ok(Math.abs(speedFromRpm(type,d.rpm)-speed)<1e-10);
  const step=motionStep(type,{playing:true,assembled:true,rpm:d.rpm,rate:3},.02);
  if(!speed)assert.deepEqual(step,{engine:0,wheels:0,flow:0});
  else assert.ok(step.wheels>0);
  const m=simulate(type,{...base,rpm:d.rpm});assert.ok(Number.isFinite(m.torque));
  if(!speed)assert.equal(m.power,0);
 }
 assert.equal(roadMotion('ice',-1).kmh,0);assert.equal(roadMotion('ev',110).kmh,100);
});
