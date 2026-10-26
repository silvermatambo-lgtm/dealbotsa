const { neon } = require('@neondatabase/serverless');
module.exports = async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!process.env.DATABASE_URL)return res.status(503).json({ok:false,database:'unconfigured'});
 try{
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql.query('SELECT current_timestamp AS checked_at, (SELECT count(*)::int FROM demo_guests) AS demo_visitors');
  return res.status(200).json({ok:true,database:'connected',checkedAt:rows[0].checked_at,visitors:rows[0].demo_visitors,retailerFeeds:'not configured',telegram:process.env.TELEGRAM_BOT_TOKEN?'configured':'not configured'});
 }catch(e){
  console.error('DealBotSA Neon HTTP health check failed',e.code||e.name||'unknown');
  let tcp='not checked';let client;
  try{
   const u=new URL(process.env.DATABASE_URL);
   const sslName=u.hostname.replace('-pooler','');
   u.hostname='eu-west-2.aws.neon.tech';
   u.searchParams.delete('sslmode');u.searchParams.delete('channel_binding');
   u.searchParams.set('options','endpoint=ep-bitter-recipe-zajc7rma');
   client=new (require('pg').Client)({connectionString:u.toString(),ssl:{rejectUnauthorized:true,servername:sslName},connectionTimeoutMillis:5000});
   await client.connect();
   const p=await client.query('SELECT count(*)::int AS demo_visitors FROM demo_guests');
   await client.end();
   return res.status(200).json({ok:true,database:'connected',transport:'Postgres TCP',visitors:p.rows[0].demo_visitors,retailerFeeds:'not configured'});
  }catch(err){tcp=err.code||err.name||'failed';try{if(client)await client.end()}catch(_){}}
  return res.status(503).json({ok:false,database:'unavailable',message:'Cloud database connectivity is currently unavailable',tcpStatus:tcp});
 }
};