// Illustrative total reduction ratios, not OEM specifications.
export const ratios={ice:5,hybrid:6,ev:9};
export const slowMotion=100;
export function drivetrain(type,rpm){return {ratio:ratios[type],wheelRpm:rpm/ratios[type]};}
export function motionStep(type,{playing,assembled,rpm=2800,rate=1},dt){
 const engine=playing?Math.max(0,Math.min(.05,dt))*Math.max(0,rpm)*Math.PI*2/60/slowMotion*rate:0;
 return {engine,wheels:assembled?engine/ratios[type]:0,flow:assembled?engine/3.1:0};
}
