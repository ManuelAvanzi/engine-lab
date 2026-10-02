// Teaching ratios, deliberately slower than real shaft speeds.
export const ratios={ice:5,hybrid:6,ev:9};
export function motionStep(type,{playing,assembled,rpm=2800,rate=1},dt){
 const factor=Math.max(.25,Math.min(2.5,rpm/(type==='ev'?6000:2800)));
 const engine=playing?Math.max(0,Math.min(.05,dt))*3.1*rate*factor:0;
 return {engine,wheels:assembled?engine/ratios[type]:0,flow:assembled?engine/3.1:0};
}
