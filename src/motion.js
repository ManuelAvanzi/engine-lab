// Illustrative total reduction ratios, not OEM specifications.
export const ratios={ice:5,hybrid:6,ev:9};
export const slowMotion=100;
// One source of timing for both moving valves and gas-flow branches.
export function valveOpening(angle,index,side){
 const phases=[0,Math.PI*3,Math.PI,Math.PI*2],cycle=Math.PI*4;
 const phase=((angle+phases[index])%cycle+cycle)%cycle;
 const centre=side===0?Math.PI*2.5:Math.PI*1.5;
 return Math.max(0,1-Math.abs(phase-centre)/(Math.PI*.48));
}
export function drivetrain(type,rpm){return {ratio:ratios[type],wheelRpm:rpm/ratios[type]};}
export function motionStep(type,{playing,assembled,rpm=2800,rate=1},dt){
 const engine=playing?(Number.isFinite(dt)?Math.max(0,dt):0)*Math.max(0,rpm)*Math.PI*2/60/slowMotion*rate:0;
 return {engine,wheels:assembled?engine/ratios[type]:0,flow:assembled?engine/3.1:0};
}

// Shared illustrative rolling diameter, in metres; no slip or gear changes.
export const wheelDiameter=.65;
export function roadMotion(type,speed){
 const kmh=Math.max(0,Math.min(100,Number(speed)||0));
 const wheelRpm=kmh/3.6/(Math.PI*wheelDiameter)*60;
 return {kmh,wheelRpm,rpm:wheelRpm*ratios[type]};
}
export function speedFromRpm(type,rpm){return Math.max(0,Math.min(100,rpm/ratios[type]*Math.PI*wheelDiameter/60*3.6));}
