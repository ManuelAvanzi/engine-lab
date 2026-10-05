// Illustrative total reduction ratios, not OEM specifications.
export const ratios={ice:5,hybrid:6,ev:9};
export const slowMotion=100;
export function drivetrain(type,rpm){return {ratio:ratios[type],wheelRpm:rpm/ratios[type]};}
export function motionStep(type,{playing,assembled,rpm=2800,rate=1},dt){
 const engine=playing?Math.max(0,Math.min(.05,dt))*Math.max(0,rpm)*Math.PI*2/60/slowMotion*rate:0;
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
