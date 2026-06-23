import { useState } from "react";
import { CONTRACT_ROLES, suggestedRenewalSalary } from "../contracts/contractEngine.js";

const fmt=value=>value>=1000?`€${(value/1000).toFixed(1)}M`:`€${value}K`;
const statusMap={
  pending:["⏳","Esperando respuesta","#f59e0b"],
  accepted:["✅","Aceptada","#22c55e"],
  completed:["📌","Renovada","#c9a84c"],
  rejected:["❌","Rechazada","#ef4444"],
  salaryCounter:["💬","Pide más salario","#60a5fa"],
  yearsCounter:["💬","Pide más años","#60a5fa"],
  roleCounter:["💬","Pide rol superior","#60a5fa"],
  withdrawn:["↩️","Retirada","#6b7280"],
};

export default function ContractsScreen({game,onOpenPlayer,onCreateRenewal,onAcceptCounter,onComplete,onWithdraw}){
  const [filter,setFilter]=useState("expiring");
  const [selected,setSelected]=useState(null);
  const [salary,setSalary]=useState(0);
  const [years,setYears]=useState(3);
  const [role,setRole]=useState("Rotación");
  const renewals=game.contracts?.renewals??[];
  const activeByPlayer=new Map(renewals.filter(item=>!["completed","withdrawn"].includes(item.status)).map(item=>[item.playerId,item]));
  const players=[...game.players].sort((a,b)=>Number(a.contractEnd??9999)-Number(b.contractEnd??9999)||(b.overall-a.overall));
  const shown=players.filter(player=>filter==="all"||Number(player.contractEnd??9999)<=Number(game.season)+1);
  const expiring=players.filter(player=>Number(player.contractEnd??9999)<=Number(game.season)+1).length;
  const pending=renewals.filter(item=>["pending","salaryCounter","yearsCounter","roleCounter","accepted"].includes(item.status)).length;
  const openRenewal=player=>{setSelected(player);setSalary(suggestedRenewalSalary(player));setYears(player.age>=31?2:3);setRole(player.squadRole??(player.overall>=82?"Titular":"Rotación"));};
  return <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
    <div style={{padding:14,background:"linear-gradient(145deg,rgba(245,158,11,.13),#13161f)",borderBottom:"1px solid rgba(245,158,11,.18)"}}>
      <div style={{fontSize:10,color:"#f59e0b",fontWeight:900,letterSpacing:".9px"}}>📄 CONTRATOS</div>
      <div style={{fontSize:20,color:"#fff",fontWeight:900,marginTop:4}}>Renovaciones y vencimientos</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginTop:12}}>
        {[["ÚLTIMO AÑO",expiring,"#f59e0b"],["NEGOCIANDO",pending,"#60a5fa"],["MASA SALARIAL",fmt(players.reduce((s,p)=>s+(p.salary??0),0)),"#c9a84c"]].map(([l,v,c])=><div key={l} style={{background:"rgba(0,0,0,.22)",borderRadius:9,padding:9,textAlign:"center"}}><div style={{fontSize:17,color:c,fontWeight:900}}>{v}</div><div style={{fontSize:8,color:"#6b7280",fontWeight:800,marginTop:2}}>{l}</div></div>)}
      </div>
    </div>
    <div style={{display:"flex",gap:7,padding:10,background:"#11141c",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
      {[["expiring","Último año"],["all","Toda la plantilla"]].map(([id,label])=><button key={id} onClick={()=>setFilter(id)} style={{flex:1,background:filter===id?"#c9a84c":"#1e2330",color:filter===id?"#1a1200":"#8b92a3",border:"none",borderRadius:8,padding:8,fontSize:11,fontWeight:800}}>{label}</button>)}
    </div>
    <div style={{flex:1,overflowY:"auto",padding:12}}>
      {shown.map(player=>{const offer=activeByPlayer.get(player.id);const status=offer?statusMap[offer.status]??["•",offer.status,"#6b7280"]:null;return <div key={player.id} style={{background:"#161a24",border:`1px solid ${status?.[2]??"rgba(255,255,255,.06)"}33`,borderRadius:11,padding:11,marginBottom:8}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <button onClick={()=>onOpenPlayer(player)} style={{width:38,height:38,borderRadius:9,background:"rgba(201,168,76,.12)",border:"1px solid rgba(201,168,76,.25)",color:"#c9a84c",fontWeight:900}}>{player.overall}</button>
          <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,color:"#e8eaf0",fontWeight:850,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{player.name}</div><div style={{fontSize:9,color:"#6b7280",marginTop:3}}>{player.pos} · {player.age}a · {fmt(player.salary??0)}/sem · rol {player.squadRole??"Rotación"}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:12,color:Number(player.contractEnd)<=Number(game.season)+1?"#f59e0b":"#9aa0b4",fontWeight:900}}>{player.contractEnd??"—"}</div><div style={{fontSize:8,color:"#6b7280"}}>FINALIZA</div></div>
        </div>
        {offer&&<div style={{marginTop:9,background:"#0d0f14",borderRadius:8,padding:9}}><div style={{fontSize:10,color:status[2],fontWeight:900}}>{status[0]} {status[1]}</div><div style={{fontSize:9,color:"#8b92a3",marginTop:4}}>Oferta: {fmt(offer.salary)}/sem · {offer.years} años · {offer.role}</div>{["salaryCounter","yearsCounter","roleCounter"].includes(offer.status)&&<button onClick={()=>onAcceptCounter(offer.id)} className="btn-gold" style={{width:"100%",marginTop:8,padding:8,borderRadius:8,fontSize:10}}>Aceptar petición del jugador</button>}{offer.status==="accepted"&&<button onClick={()=>onComplete(offer.id)} className="btn-gold" style={{width:"100%",marginTop:8,padding:8,borderRadius:8,fontSize:10}}>Firmar renovación</button>}{!["completed","withdrawn"].includes(offer.status)&&<button onClick={()=>onWithdraw(offer.id)} className="btn-ghost" style={{width:"100%",marginTop:7,padding:7,borderRadius:8,fontSize:10}}>Retirar oferta</button>}</div>}
        {!offer&&<button onClick={()=>openRenewal(player)} className="btn-gold" style={{width:"100%",marginTop:9,padding:9,borderRadius:8,fontSize:11}}>Negociar renovación</button>}
      </div>})}
      {!shown.length&&<div style={{textAlign:"center",color:"#6b7280",padding:30,fontSize:12}}>No hay contratos en esta vista.</div>}
    </div>
    {selected&&<div style={{padding:12,background:"#12151d",borderTop:"1px solid rgba(201,168,76,.2)"}}><div style={{fontSize:11,color:"#c9a84c",fontWeight:900,marginBottom:8}}>RENOVAR · {selected.name}</div><div style={{display:"grid",gridTemplateColumns:"1fr 82px",gap:7}}><input type="number" value={salary} onChange={event=>setSalary(Number(event.target.value))} style={{background:"#1e2330",border:"1px solid rgba(255,255,255,.1)",color:"#fff",borderRadius:8,padding:9}}/><select value={years} onChange={event=>setYears(Number(event.target.value))} style={{background:"#1e2330",color:"#fff",border:"1px solid rgba(255,255,255,.1)",borderRadius:8}}>{[1,2,3,4,5].map(item=><option key={item} value={item}>{item} años</option>)}</select><select value={role} onChange={event=>setRole(event.target.value)} style={{gridColumn:"1 / -1",background:"#1e2330",color:"#fff",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,padding:9}}>{CONTRACT_ROLES.map(item=><option key={item}>{item}</option>)}</select><button onClick={()=>{onCreateRenewal(selected.id,salary,years,role);setSelected(null);}} className="btn-gold" style={{gridColumn:"1 / -1",padding:10,borderRadius:8}}>Enviar propuesta</button><button onClick={()=>setSelected(null)} className="btn-ghost" style={{gridColumn:"1 / -1",padding:8,borderRadius:8}}>Cancelar</button></div></div>}
  </div>;
}
