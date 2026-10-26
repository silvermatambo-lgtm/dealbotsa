const { neon } = require('@neondatabase/serverless');
module.exports = async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});
 if(!process.env.DATABASE_URL) return res.status(503).json({ok:false,database:'unconfigured'});
 try {
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql.query("SELECT current_timestamp AS checked_at, (SELECT count(*)::int FROM demo_guests) AS demo_visitors");
  return res.status(200).json({ok:true,database:'connected',checkedAt:rows[0].checked_at,visitors:rows[0].demo_visitors,sourceConnections:{takealot:'not configured',amazon:'not configured',vodabucks:'not configured',checkers:'not configured'},telegram:process.env.TELEGRAM_BOT_TOKEN?'configured':'not configured'});
 }catch(e){console.error('DB health check failed',e.message);return res.status(503).json({ok:false,database:'unavailable',message:'Database temporarily unavailable',diagnostic:e.code||e.name||'unknown',detail:String(e.message||'').slice(0,180),reason:String(e.cause?.message||'').slice(0,180),reasonCode:e.cause?.code||null});}
};