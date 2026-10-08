import {systems,scenarios} from './data.js';
export function validateProject(value){
 const fail=()=>{throw Error('EngineLab: Configurazione non valida.');};
 if(!value||value.version!==1||typeof value.name!=='string'||!value.name.trim()||value.name.trim().length>100||typeof value.notes!=='string'||value.notes.length>2000)fail();
 const s=value.settings;if(!s||!Object.hasOwn(systems,s.type)||!systems[s.type].components.includes(s.selected)||!Object.hasOwn(scenarios,s.scenario))fail();
 for(const [key,min,max] of [['speed',0,100],['load',10,100],['ambient',-10,45],['explode',0,100],['brightness',0,100]])if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)fail();
 for(const key of ['cooling','section','car'])if(typeof s[key]!=='boolean')fail();
 if(!s.parts||typeof s.parts!=='object'||Array.isArray(s.parts))fail();
 const parts={};for(const [id,p] of Object.entries(s.parts)){if(!systems[s.type].components.includes(id)||!p||typeof p.detached!=='boolean'||!Array.isArray(p.offset)||p.offset.length!==3||p.offset.some(v=>!Number.isFinite(v)||Math.abs(v)>5))fail();parts[id]={detached:p.detached,offset:[...p.offset]};}
 return {version:1,name:value.name.trim(),notes:value.notes,settings:{type:s.type,selected:s.selected,scenario:s.scenario,speed:s.speed,load:s.load,ambient:s.ambient,cooling:s.cooling,section:s.section,car:s.car,explode:s.explode,brightness:s.brightness,parts}};
}
