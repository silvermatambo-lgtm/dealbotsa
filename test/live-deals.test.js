const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/live-deals.js');
function response() {
  return { headers:{}, code:200, setHeader(k,v){this.headers[k]=v;return this;},
    status(n){this.code=n;return this;}, json(data){this.body=data;return this;} };
}
function setup(key, approval) {
  if (key === null) delete process.env.AZLABS_API_KEY; else process.env.AZLABS_API_KEY=key;
  if (approval === null) delete process.env.AZLABS_PUBLISHING_APPROVED;
  else process.env.AZLABS_PUBLISHING_APPROVED=approval;
}
test('does not publish retailer data without written-use permission',async()=>{
  setup('fake-test-credential','false');
  const res=response();await handler({method:'GET',query:{q:'milk'}},res);
  assert.equal(res.code,200);assert.equal(res.body.live,false);
  assert.equal(res.body.status,'publishing-permission-required');
  assert.equal(res.headers['Cache-Control'],'no-store, max-age=0');
});
test('does not publish without a provider API key',async()=>{
  setup(null,'true');const res=response();
  await handler({method:'GET',query:{q:'milk'}},res);
  assert.equal(res.body.live,false);assert.equal(res.body.status,'api-key-required');
});
test('rejects unsupported methods',async()=>{
  const res=response();await handler({method:'POST',query:{q:'milk'}},res);
  assert.equal(res.code,405);
});
test('fetches only the approved Checkers endpoint and removes cross-store offers',async()=>{
  setup('fake-test-credential','true');
  const original=global.fetch;
  global.fetch=async (url,options)=>{
    const target=new URL(url);
    assert.equal(target.origin,'https://azlabs.ai');
    assert.equal(target.pathname,'/api/v1/grocery/search');
    assert.equal(target.searchParams.get('store'),'checkers');
    assert.equal(options.redirect,'error');
    return {ok:true,json:async()=>({products:[
      {productId:'abc',name:'Fresh Milk 2L',store:'checkers',price:34.99,wasPrice:39.99,memberPrice:31.99,inStock:true,fetchedAt:'2026-11-09T10:00:00Z'},
      {productId:'another',name:'Example PnP milk',store:'pnp',price:25}
    ]})};
  };
  try{
    const res=response();await handler({method:'GET',query:{q:'milk',limit:'10'}},res);
    assert.equal(res.code,200);assert.equal(res.body.live,true);
    assert.equal(res.body.products.length,1);assert.equal(res.body.products[0].name,'Fresh Milk 2L');
    assert.equal(res.body.products[0].wasPrice,39.99);
    assert.equal(res.body.products[0].memberPrice,31.99);
    assert.equal(JSON.stringify(res.body).includes('fake-test-credential'),false);
  }finally{global.fetch=original;}
});
test('does not fabricate prices when provider response format changes',async()=>{
  setup('fake-test-credential','true');
  const original=global.fetch;
  global.fetch=async()=>({ok:true,json:async()=>({unknown:[]})});
  try{const res=response();await handler({method:'GET',query:{q:'milk'}},res);
    assert.equal(res.code,502);assert.equal(res.body.live,false);
  }finally{global.fetch=original;}
});
