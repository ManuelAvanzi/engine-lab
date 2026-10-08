import {simulate,co2PerLiter} from './data.js';
import {roadMotion} from './motion.js';

// Educational elapsed-time model. Totals follow road time, not the animation's slow motion.
export class LiveSimulation {
 constructor(type='ice',ambient=20){this.reset(type,ambient);}
 reset(type,ambient=20){this.type=type;this.temperature=ambient;this.seconds=0;this.distance=0;this.fuel=0;this.energy=0;this.co2=0;}
 step(input,elapsed){
  const type=input.type||'ice',ambient=Number(input.ambient)||0;
  if(type!==this.type)this.reset(type,ambient);
  const motion=roadMotion(type,input.speed),m=simulate(type,{...input,rpm:motion.rpm});
  const paused=input.playing===false||input.hidden||input.assembled===false;
  const dt=paused?0:Number.isFinite(elapsed)?Math.max(0,elapsed):0;
  const running=!paused&&motion.kmh>0;
  const target=running?m.temperature:ambient;
  const tau=running?90:180;
  const startTemp=this.temperature;
  this.temperature=target+(startTemp-target)*Math.exp(-dt/tau);
  // Exact first-order average makes heat/power integration independent of refresh rate.
  const warmup=t=>type==='ev'?1:1+.15*Math.max(0,Math.min(1,(70-t)/50));
  const boundaries=[0,dt];
  for(const threshold of [20,70]){const ratio=(threshold-target)/(startTemp-target),at=-tau*Math.log(ratio);if(at>0&&at<dt)boundaries.push(at);}
  boundaries.sort((a,b)=>a-b);
  let warmupIntegral=0;
  for(let i=1;i<boundaries.length;i++){const a=boundaries[i-1],b=boundaries[i];if(b===a)continue;const averageTemp=target+(startTemp-target)*tau/(b-a)*(Math.exp(-a/tau)-Math.exp(-b/tau));warmupIntegral+=(b-a)*warmup(averageTemp);}
  const baseRate=running?m.energy*motion.kmh/100:0;
  const inputKw=baseRate*warmup(this.temperature);
  const energyStep=baseRate*warmupIntegral/3600;
  const litersHour=type==='ev'?0:inputKw/8.9;
  const litersStep=type==='ev'?0:energyStep/8.9;
  if(running){this.seconds+=dt;this.distance+=motion.kmh*dt/3600;this.fuel+=litersStep;this.energy+=energyStep;this.co2+=litersStep*co2PerLiter*1000;}
  const per100=motion.kmh>0?m.consumption*warmup(this.temperature):null;
  const efficiency=m.efficiency/warmup(this.temperature);
  return {running,paused,temperature:this.temperature,per100,kmPerLiter:per100&&type!=='ev'?100/per100:null,
   litersHour,inputKw,powerKw:inputKw*efficiency/100,efficiency,
   co2Second:litersHour*co2PerLiter*1000/3600,co2Km:type==='ev'?0:per100===null?null:per100*co2PerLiter*10,
   seconds:this.seconds,distance:this.distance,fuel:this.fuel,energy:this.energy,co2:this.co2};
 }
}
