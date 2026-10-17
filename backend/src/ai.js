import dotenv from 'dotenv';
dotenv.config();

const schemes=[
 {id:'pmfme',name:'PM Formalisation of Micro Food Processing Enterprises',type:'Credit Linked Subsidy',support:'Up to 35% credit-linked subsidy',sector:['food','processing'],budget:1000000,source:'MoFPI',url:'https://pmfme.mofpi.gov.in/'},
 {id:'mudra',name:'Pradhan Mantri MUDRA Yojana',type:'Business Loan',support:'Shishu, Kishor and Tarun loan categories',sector:['retail','services','food','manufacturing'],budget:1000000,source:'Government of India',url:'https://www.mudra.org.in/'},
 {id:'standup',name:'Stand-Up India',type:'Bank Loan',support:'Composite loans for eligible greenfield enterprises',sector:['manufacturing','services','trading'],budget:1000000,source:'Government of India',url:'https://www.standupmitra.in/'},
 {id:'msme-competitive',name:'MSME Competitive / Technology Support',type:'MSME Support',support:'Technology, productivity and competitiveness support',sector:['manufacturing','services'],budget:5000000,source:'MSME Ministry',url:'https://msme.gov.in/'}
];

export function getSchemes(){return schemes;}
export function schemeMatch(profile={}){
 const budget=Number(profile.budget||0), sector=(profile.sector||'').toLowerCase();
 return schemes.map(s=>{let score=0;if(s.budget>=budget && budget>0)score+=45;if(s.sector.some(x=>sector.includes(x)))score+=35;if(profile.location)score+=10;if(budget>0 && budget<=500000)score+=10;return {...s,score:Math.min(99,score)};}).sort((a,b)=>b.score-a.score);
}

function localAnswer(message, profile={}){
 const m=message.toLowerCase();
 const name=profile.businessName||'your business';
 if(m.includes('scheme')||m.includes('subsidy')||m.includes('loan')){
   const top=schemeMatch(profile).slice(0,3);
   return `For ${name}, I would shortlist ${top.map(x=>x.name).join(', ')}. I can compare eligibility, support type and next steps. For live government information, verify the latest details on the official scheme portal before applying.`;
 }
 if(m.includes('competitor')||m.includes('market')||m.includes('price')) return `For ${name}, start with local demand, competitor density, pricing and operating hours. In this demo, the Market module gives a locality snapshot and competitor gap analysis. For changing prices or live web data, connect the TinyFish adapter.`;
 if(m.includes('profit')||m.includes('finance')||m.includes('feasib')) return `A simple feasibility view is revenue − fixed costs − variable costs. Keep a buffer for working capital and test conservative, expected and optimistic scenarios before investing.`;
 if(m.includes('risk')||m.includes('swot')) return `Key risks to check are uncertain demand, competitor pressure, weak finance planning, lack of expertise, operations and resource availability. The SWOT module converts these into strengths, weaknesses, opportunities and threats.`;
 if(m.includes('location')) return `Location quality should be judged using demand, nearby competitors, connectivity, rent, customer access and local business density. The prototype stores the chosen locality and shows a map-style competitor view.`;
 return `I’m SARATHI, your digital business copilot. I can help with business feasibility, local market/competitor analysis, government schemes, finance planning, SWOT, risk detection and a personalized action plan. Tell me your business idea, budget or locality.`;
}

export async function chat(message, profile={}){
 if(process.env.GROQ_API_KEY){
  try{
   const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.GROQ_API_KEY}`},body:JSON.stringify({model:process.env.GROQ_MODEL||'llama-3.1-8b-instant',temperature:.25,messages:[{role:'system',content:`You are SARATHI, an AI business copilot for Indian small/rural businesses. Answer in concise helpful English or Hinglish. Never invent live government scheme eligibility. Business profile: ${JSON.stringify(profile)}`},{role:'user',content:message}]})});
   if(r.ok){const j=await r.json();return j.choices?.[0]?.message?.content||localAnswer(message,profile);}
  }catch{}
 }
 return localAnswer(message,profile);
}

export async function tinyfishTask(query, profile={}){
 if(!process.env.TINYFISH_API_URL) return {mode:'demo',query,results:[{title:'Live Web Adapter Ready',detail:'Set TINYFISH_API_URL and TINYFISH_API_KEY to connect a real TinyFish-compatible endpoint.',source:'Configuration'}]};
 try{const r=await fetch(process.env.TINYFISH_API_URL,{method:'POST',headers:{'Content-Type':'application/json',...(process.env.TINYFISH_API_KEY?{Authorization:`Bearer ${process.env.TINYFISH_API_KEY}`}:{})},body:JSON.stringify({query,profile})});const text=await r.text();return {mode:'live',status:r.status,raw:text};}catch(e){return {mode:'error',error:e.message};}
}
