const { neon } = require('@neondatabase/serverless');
module.exports = async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!process.env.DATABASE_URL) return res.status(503).json({ok:false,database:'unconfigured'});
 try {
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql.query("SELECT current_timestamp AS checked_at, (SELECT count(*)::int FROM demo_guests) AS demo_visitors");
  return res.status(200).json({ok:true,database:'connected',checkedAt:rows[0].checked_at,visitors:rows[0].demo_visitors,sourceConnections:{takealot:'not configured',amazon:'not configured',vodabucks:'not configured',checkers:'not configured'},telegram:process.env.TELEGRAM_BOT_TOKEN?'configured':'not configured'});
 }catch(e){
  console.error('DB health check failed',e.message);
  let dnsResult='not checked', networkResult='not checked',baseDns='not checked',hostTest='not checked',directHostTest='not checked',dohStatus='not checked',alternateDoh='not checked',regionDoh='not checked';
  try{const h=new URL(process.env.DATABASE_URL).hostname;await require('node:dns').promises.lookup(h);dnsResult='resolved'}catch(d){dnsResult=d.code||d.name}
  try{await require('node:dns').promises.lookup('api.github.com');baseDns='resolved'}catch(e){baseDns=e.code||e.name}try{const host=new URL(process.env.DATABASE_URL).hostname;const x=await fetch('https://'+host+'/sql',{method:'OPTIONS',signal:AbortSignal.timeout(4000)});hostTest=String(x.status)}catch(e){hostTest=e.cause?.code||e.code||e.name}try{const host=new URL(process.env.DATABASE_URL).hostname.replace('-pooler','');const x=await fetch('https://'+host+'/sql',{method:'OPTIONS',signal:AbortSignal.timeout(4000)});directHostTest=String(x.status)}catch(e){directHostTest=e.cause?.code||e.code||e.name}try{const x=await fetch('https://api.github.com',{signal:AbortSignal.timeout(4000)});networkResult=String(x.status)}catch(n){networkResult=n.cause?.code||n.code||n.name}
  try{const hn=new URL(process.env.DATABASE_URL).hostname;const dr=await fetch('https://dns.google/resolve?name='+encodeURIComponent(hn)+'&type=A',{signal:AbortSignal.timeout(4000)});const q=await dr.json();dohStatus=String(q.Status)+' / '+(q.Answer?.length||0)}catch(e){dohStatus=e.name}try{const h=new URL(process.env.DATABASE_URL).hostname.replace('.c-2.','.');const dr=await fetch('https://dns.google/resolve?name='+encodeURIComponent(h)+'&type=A',{signal:AbortSignal.timeout(4000)});const q=await dr.json();alternateDoh=String(q.Status)+' / '+(q.Answer?.length||0)}catch(e){alternateDoh=e.name}try{const dr=await fetch('https://dns.google/resolve?name=eu-west-2.aws.neon.tech&type=A',{signal:AbortSignal.timeout(4000)});const q=await dr.json();regionDoh=String(q.Status)+' / '+(q.Answer?.length||0)}catch(e){regionDoh=e.name}return res.status(503).json({ok:false,database:'unavailable',diagnostic:e.name||'unknown',detail:String(e.message||'').slice(0,150),dnsResult,networkResult,baseDns,hostTest,directHostTest,dohStatus,alternateDoh,regionDoh});
 }
};