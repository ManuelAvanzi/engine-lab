import * as THREE from 'three';
export const insideNotes={
 sump:['Una vasca per la lubrificazione','La coppa raccoglie l’olio. Le paratie ne limitano lo spostamento; il pescante con filtro a rete lo porta verso la pompa, che si trova a valle.','Ambra: olio · turchese: pescante · chiaro: paratie'],
 cover:['Un coperchio, non un blocco pieno','Il coperchio chiude la testata. Sotto la parete esterna possono esserci diaframmi che separano le gocce di olio dai vapori; sul bordo lavora la guarnizione.','In evidenza: diaframma e bordo di tenuta'],
 head:['Valvole dentro una struttura portante','Gli steli scorrono nelle guide; le molle richiamano le valvole verso le sedi. Gli alberi a camme comandano l’apertura. Il corpo della testata è reso trasparente.','In evidenza: valvole, molle e alberi a camme'],
 pistons:['Cielo, mantello e spinotto','Il cielo riceve la pressione. Sotto si trovano il mantello alleggerito e i supporti dello spinotto, che collega la biella. Le fasce sul bordo assicurano tenuta.','In evidenza: spinotto e fasce · cavità semplificata'],
 rods:['Un elemento resistente, con due sedi','Il fusto è pieno e sagomato per resistere con poco peso. Il piede ospita lo spinotto, la testa avvolge il perno dell’albero con le bronzine. Non è un tubo cavo.','In evidenza: sedi e bronzine'],
 crank:['Perni, contrappesi e lubrificazione','L’albero è prevalentemente pieno. Forature interne portano l’olio ai perni; i contrappesi contribuiscono al bilanciamento. Il canale colorato è schematico.','Turchese: esempio di canale dell’olio'],
 block:['Cilindri e passaggi di raffreddamento','Le canne guidano i pistoni. Attorno ai cilindri passano cavità per il refrigerante; altri condotti distribuiscono olio ai supporti.','Turchese: percorso di raffreddamento schematico'],
 intake:['Condotti che distribuiscono aria','Un volume comune alimenta i rami diretti ai cilindri. I condotti sono cavi; forma e lunghezza influenzano il riempimento. Le linee interne indicano il passaggio dell’aria.','Turchese: percorso interno dell’aria'],
 exhaust:['Rami che raccolgono i gas','I tubi cavi raccolgono i gas dalle valvole di scarico e li convogliano verso un’uscita comune. Qui osservi i passaggi, non il catalizzatore a valle.','Ambra: percorso interno dei gas'],
 timing:['Una trasmissione meccanica','Pulegge o ruote dentate sono collegate da cinghia o catena. Non c’è un fluido interno: il collegamento mantiene la fasatura tra albero motore e camme.','In evidenza: percorso della trasmissione'],
 motor:['Parte fissa e parte rotante','Gli avvolgimenti dello statore circondano il rotore. Fra i due rimane un piccolo traferro: il campo magnetico trasferisce coppia senza contatto diretto.','Rame: avvolgimenti · chiaro: rotore'],
 inverter:['Elettronica sotto il coperchio','Moduli di potenza commutano la corrente. Condensatori stabilizzano il collegamento DC; una piastra raffreddata smaltisce il calore.','Ambra: moduli · turchese: condensatori'],
 battery:['Celle riunite in moduli','Il contenitore protegge gruppi di celle collegati elettricamente. Il sistema di gestione ne controlla tensione e temperatura; una piastra aiuta a raffreddarle.','Ambra: moduli di celle · turchese: raffreddamento'],
 transmission:['Ingranaggi dentro il carter','Il carter sostiene alberi e ingranaggi lubrificati. Nell’ibrido parallelo il gruppo trasmette il contributo dei due motori. È uno schema, non un cambio OEM.','Ambra: coppia di ingranaggi illustrativa'],
 housing:['Un involucro con raffreddamento','Il carter sostiene gli organi e delimita lo spazio per statore e rotore. Una camicia può far circolare refrigerante attorno allo statore.','Turchese: esempio di camicia di raffreddamento'],
 stator:['Rame e lamierini isolati','Gli avvolgimenti si dispongono nelle cave del pacco di lamierini. Il rame crea il campo magnetico; i lamierini limitano le correnti parassite.','In evidenza: avvolgimenti e loro suddivisione'],
 rotor:['Un nucleo con magneti','Il pacco di lamierini sostiene i magneti ed è solidale all’albero. Il modello mostra magneti sulla periferia; altri motori li incorporano nel nucleo.','In evidenza: magneti sulla periferia'],
 shaft:['Acciaio che trasmette la coppia','Questo albero è rappresentato pieno: la trasparenza aiuta a leggerne volume e asse, ma non indica una cavità. Le estremità collegano rotore e riduttore.','Elemento pieno · nessuna cavità simulata'],
 bearings:['Sfere tra due piste','Le sfere rotolano tra anello interno ed esterno. Una gabbia le distanzia; il lubrificante riduce attrito e usura delle superfici.','In evidenza: corpi volventi'],
 reducer:['Due ruote dentate nel carter','Un pignone piccolo aziona una ruota più grande: diminuiscono i giri e aumenta la coppia. Il carter contiene olio e sostiene gli alberi.','Ambra: ingranaggi · geometria e rapporto illustrativi']
};
export function addInsideDetails(v){
 const amber='#dfb35e',cyan='#64c9cf',silver='#c4d3ce';
 for(const [id,p] of Object.entries(v.parts)){
  const g=new THREE.Group();g.name='Dettagli interni didattici';g.userData.insideDetails=true;g.visible=false;p.add(g);p.insideGroup=g;
  const add=(geo,pos,color,rot=[0,0,0])=>{const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.18}));m.position.set(...pos);m.rotation.set(...rot);m.userData.insideDetail=true;g.add(m);return m;};
  const box=(size,pos,color=silver)=>add(new THREE.BoxGeometry(...size),pos,color);
  const tube=(points,r=.03,color=cyan)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,8,false),[0,0,0],color);
  const ring=(r,t,pos,color=cyan,axis='x')=>add(new THREE.TorusGeometry(r,t,8,48),pos,color,axis==='x'?[0,Math.PI/2,0]:[Math.PI/2,0,0]);
  const gear=(r,pos)=>{add(new THREE.CylinderGeometry(r,r,.13,24),pos,amber,[0,0,Math.PI/2]);for(let a=0;a<Math.PI*2;a+=Math.PI/12){const m=box([.15,.08,.09],[pos[0],pos[1]+Math.sin(a)*r,pos[2]+Math.cos(a)*r],silver);m.rotation.x=-a;}};
  if(id==='sump'){
   box([3.5,.07,1.02],[0,-.005,0],amber);
   for(const x of [-.9,.9])box([.035,.20,1.0],[x,.10,0]);
   tube([[-.5,.04,0],[-.5,.16,0],[.15,.21,0],[.45,.24,0]],.045);
   add(new THREE.CylinderGeometry(.20,.20,.035,24),[-.5,.04,0],cyan);
   for(let x=-.64;x<-.3;x+=.05)box([.013,.012,.25],[x,.02,0],silver);
  }
  if(id==='cover'){box([3.35,.025,.78],[0,2.78,0]);for(let x=-1.4;x<1.5;x+=.35)box([.12,.06,.6],[x,2.8,0],cyan);}
  if(id==='block')for(const x of [-1.38,-.46,.46,1.38]){ring(.405,.027,[x,1.2,0],cyan,'y');tube([[x,1.2,.405],[x,1.6,.405]],.027);}
  if(id==='crank'){g.removeFromParent();v.crankRotor.add(g);tube([[-2,.43,0],[0,.43,0],[1.7,.43,0]],.03);}
  if(id==='intake'||id==='exhaust')for(const x of [-1.38,-.46,.46,1.38]){if(id==='intake')tube([[x,2.17,-.65],[x,2.23,-.95],[x,1.84,-1.19],[x,1.58,-1.18]],.025);else tube([[x,2.02,.65],[x,1.91,.98],[x*.63,1.3,1.21],[x*.35,1.03,1.27]],.025,amber);}
  if(id==='inverter'){const ev=v.type==='ev',x=ev?0:2.7,y=ev?2.55:1.95;for(const d of [-.3,0,.3])box([.19,.12,.42],[x+d,y,0],amber);for(const z of [-.36,.36])add(new THREE.CylinderGeometry(.085,.085,.16,20),[x-.36,y,z],cyan);box([ev?2.05:1,.025,.94],[x,y-.12,0]);}
  if(id==='battery'){const ev=v.type==='ev',x=ev?0:.1,y=ev?.01:.35,z=ev?-1.95:-2.4;for(let a=-1.3;a<=1.3;a+=.38)for(const b of [-.29,.29])box([.28,.23,.43],[x+a,y,z+b],amber);box([ev?3.5:2.8,.025,.9],[x,y-.15,z],cyan);}
  if(id==='housing')for(const x of [-.8,-.4,0,.4,.8])ring(.94,.025,[x,1.17,0]);
  if(id==='motor')for(let a=0;a<Math.PI*2;a+=Math.PI/6)box([.48,.12,.14],[2.86,.85+Math.sin(a)*.49,Math.cos(a)*.49],amber);
  if(id==='reducer'){gear(.47,[2.17,1.04,0]);gear(.27,[2.17,.67,.67]);}
  if(id==='transmission'){gear(.25,[3.73,.99,0]);gear(.16,[3.73,.64,.22]);}
 }
}
export function applyInside(v){
 const active=v.insideId===v.selected;
 if(active)for(const [id,p] of Object.entries(v.parts))p.visible=id===v.selected;
 if(v.car)v.car.visible=!active&&v.carMode&&!v.isolated&&!v.xrSession&&v.host.dataset.vehicleStatus==='ready';
 for(const [id,p] of Object.entries(v.parts))if(p.insideGroup)p.insideGroup.visible=active&&id===v.selected;
 for(const m of v.meshes){if(!active||m.userData.part!==v.selected)continue;
  const id=v.selected,t=m.geometry.type;
  const keep=(['pistons','rods','timing'].includes(id)&&t==='TorusGeometry')||(id==='pistons'&&t==='CylinderGeometry'&&m.geometry.parameters.radiusTop<.1)||(id==='head'&&!m.userData.shell)||(id==='bearings'&&t==='SphereGeometry')||(id==='rotor'&&t!=='CylinderGeometry')||(id==='stator'&&t==='RoundedBoxGeometry'&&m.geometry.parameters.width<.1);
  m.material.needsUpdate=true;m.material.transparent=!keep;m.material.opacity=keep?1:v.insideOpacity;m.material.depthWrite=keep;m.visible=true;
 }
}
