const crypto=require('node:crypto');
const {neon}=require('@neondatabase/serverless');
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!process.env.DATABASE_URL)return res.status(503).json({ok:false,error:'Database unavailable'});
 const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('dbsa_guest='));
 const token=raw?raw.slice('dbsa_guest='.length):'';
 if(!/^[a-f0-9]{64}$/.test(token))return res.status(200).json({ok:true,events:[]});
 try{
 const key=crypto.createHash('sha256').update(token).digest('hex');
 const sql=neon(process.env.DATABASE_URL);
 const rows=await sql.query('SELECT product_name,previous_price,new_price,source_type,observed_at FROM demo_price_events WHERE guest_hash=$1 ORDER BY observed_at DESC LIMIT 25',[key]);
 return res.status(200).json({ok:true,events:rows});
 }catch(e){console.error('DealBotSA history error',e.message);return res.status(503).json({ok:false,error:'History temporarily unavailable'})}
};