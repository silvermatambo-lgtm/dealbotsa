const crypto=require('node:crypto');
const {neon}=require('@neondatabase/serverless');
function guest(req,res){
 const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('dbsa_guest='));
 let token=raw?raw.slice('dbsa_guest='.length):null;
 if(!token||!/^[a-f0-9]{64}$/.test(token)){
  token=crypto.randomBytes(32).toString('hex');
  res.setHeader('Set-Cookie','dbsa_guest='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7776000');
 }
 return crypto.createHash('sha256').update(token).digest('hex');
}
function clean(s){
 if(!s||typeof s!=='object'||Array.isArray(s))throw Error('invalid state');
 const arr=(k,max)=>Array.isArray(s[k])?s[k].slice(0,max):[];
 const id=x=>typeof x==='string'||typeof x==='number';
 const products=arr('products',120).filter(p=>p&&typeof p==='object'&&id(p.id)&&typeof p.name==='string').map(p=>({
 id:p.id,name:p.name.slice(0,150),cat:String(p.cat||'Electronics').slice(0,30),ret:String(p.ret||'Takealot').slice(0,35),
 now:Math.min(1000000,Math.max(0,Number(p.now)||0)),was:Math.min(1000000,Math.max(0,Number(p.was)||0)),
 market:Math.min(1000000,Math.max(0,Number(p.market)||0)),emoji:String(p.emoji||'📦').slice(0,8),
 a:String(p.a||'#eaf3e7').slice(0,30),b:String(p.b||'#d1e7ce').slice(0,30),
 ...(p.manual===true?{manual:true}:{}),
 ...(typeof p.url==='string'&&/^https:\/\//.test(p.url)?{url:p.url.slice(0,600)}:{}),
 ...(Array.isArray(p.history)?{history:p.history.slice(-24).map(Number).filter(Number.isFinite)}:{})
 }));
 return {products,watch:arr('watch',120).filter(id),
 rules:arr('rules',80).filter(r=>r&&id(r.id)&&typeof r.name==='string').map(r=>({
 id:r.id,name:r.name.slice(0,80),cat:String(r.cat||'All categories').slice(0,40),
 ret:String(r.ret||'All stores').slice(0,40),min:Math.max(0,Math.min(100,Number(r.min)||0)),
 max:Math.max(0,Math.min(1000000,Number(r.max)||0)),active:r.active!==false})),
 notifications:arr('notifications',60).filter(n=>n&&typeof n.title==='string').map(n=>({
 id:n.id,title:n.title.slice(0,140),text:String(n.text||'').slice(0,600),type:n.type==='alert'?'alert':'system',time:String(n.time||'').slice(0,75)})),
 scans:Math.max(0,Math.min(1000000,Number(s.scans)||0)),lastScan:s.lastScan?String(s.lastScan).slice(0,80):null,push:s.push===true};
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!process.env.DATABASE_URL)return res.status(503).json({ok:false,error:'Database not configured'});
 if(req.method==='POST'){
  const origin=req.headers.origin,expected='https://'+req.headers.host;
  if(origin&&origin!==expected)return res.status(403).json({ok:false,error:'Origin not allowed'});
  if(!String(req.headers['content-type']||'').includes('application/json'))return res.status(415).json({ok:false,error:'JSON required'});
  if(Number(req.headers['content-length']||0)>100000)return res.status(413).json({ok:false,error:'Payload too large'});
 }
 try{
  const key=guest(req,res),sql=neon(process.env.DATABASE_URL);
  if(req.method==='GET'){
   const rows=await sql.query('SELECT payload,updated_at FROM demo_guests WHERE guest_hash=$1',[key]);
   if(!rows.length){await sql.query('INSERT INTO demo_guests(guest_hash) VALUES($1) ON CONFLICT DO NOTHING',[key]);return res.status(200).json({ok:true,saved:false,state:null});}
   const p=rows[0].payload;
   return res.status(200).json({ok:true,saved:!!p&&Object.keys(p).length>0,state:p,updatedAt:rows[0].updated_at});
  }
  if(Buffer.byteLength(JSON.stringify(req.body||{}))>100000)return res.status(413).json({ok:false,error:'Payload too large'});
  let saved;try{saved=clean(req.body?.state)}catch(e){return res.status(400).json({ok:false,error:'Invalid saved data'})}
  const old=await sql.query('SELECT payload FROM demo_guests WHERE guest_hash=$1',[key]);
  const previous=old?.[0]?.payload?.products||[];
  await sql.query("INSERT INTO demo_guests(guest_hash,payload,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(guest_hash) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()",[key,JSON.stringify(saved)]);
  let events=0;
  for(const p of saved.products){
   const prior=previous.find(x=>String(x.id)===String(p.id));
   if(!prior||!(Number(p.now)<Number(prior.now)))continue;
   await sql.query('INSERT INTO demo_price_events(guest_hash,product_id,product_name,previous_price,new_price,source_type) VALUES($1,$2,$3,$4,$5,$6)',[key,String(p.id),p.name,Number(prior.now),Number(p.now),p.manual?'manual':'simulation']);
   if(++events>=20)break;
  }
  return res.status(200).json({ok:true,saved:true,priceEventsRecorded:events,updatedAt:new Date().toISOString()});
 }catch(e){console.error('DealBotSA state error',e.message);return res.status(503).json({ok:false,error:'Could not reach database. Local copy remains on this device.'})}
};