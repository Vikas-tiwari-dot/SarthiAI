import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import {readDb,writeDb,id} from './store.js';
import {chat,schemeMatch,getSchemes,tinyfishTask} from './ai.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const app=express();app.use(cors({ origin: process.env.FRONTEND_ORIGIN || true }));app.use(express.json({ limit: '1mb' }));
const PORT=process.env.PORT||5000, SECRET=process.env.JWT_SECRET||'sarathi-local-demo-secret-change-me';
const DEMO_AUTH = process.env.DEMO_AUTH !== 'false'; // Local prototype convenience; disable for real deployments.
const hash=p=>bcrypt.createHash('sha256').update(p).digest('hex');
const token=u=>jwt.sign({id:u.id,email:u.email},SECRET,{expiresIn:'7d'});
function auth(req,res,next){try{const h=req.headers.authorization||'';req.user=jwt.verify(h.replace('Bearer ',''),SECRET);next();}catch{return res.status(401).json({message:'Unauthorized'});}}

app.get('/api/health',(req,res)=>res.json({ok:true,service:'SARATHI API',time:new Date().toISOString()}));
app.post('/api/auth/register',(req,res)=>{const name=String(req.body?.name||'').trim();const email=String(req.body?.email||'').trim().toLowerCase();const password=String(req.body?.password||'');if(!name||!email||!password)return res.status(400).json({message:'Name, email/username and password are required'});const db=readDb();if(db.users.some(u=>String(u.email||'').toLowerCase()===email)){if(DEMO_AUTH){const u=db.users.find(x=>String(x.email||'').toLowerCase()===email);return res.json({token:token(u),user:{id:u.id,name:u.name,email:u.email},profile:db.profiles[u.id]||{}})}return res.status(409).json({message:'Email already registered'});}const u={id:id(),name,email,password:hash(password),createdAt:new Date().toISOString()};db.users.push(u);db.profiles[u.id]={ownerName:name};db.chats[u.id]=[];writeDb(db);res.json({token:token(u),user:{id:u.id,name:u.name,email:u.email},profile:db.profiles[u.id]});});
app.post('/api/auth/login',(req,res)=>{
 const email=String(req.body?.email||'').trim().toLowerCase();
 const password=String(req.body?.password||'');
 if(!email || !password) return res.status(400).json({message:'Enter any email/username and password to continue.'});
 const db=readDb();
 let u=db.users.find(x=>String(x.email||'').toLowerCase()===email);
 // DEMO_AUTH is intentionally permissive for judging/local demos: any non-empty
 // credentials sign in. This is NOT secure authentication for public deployment.
 if(!u && DEMO_AUTH){
   const name=String(req.body?.name||email.split('@')[0]||'Business Owner').replace(/[<>]/g,'').slice(0,80);
   u={id:id(),name,email,password:hash(password),createdAt:new Date().toISOString(),demoAccount:true};
   db.users.push(u); db.profiles[u.id]={ownerName:name}; db.chats[u.id]=[]; writeDb(db);
 }
 if(!u) return res.status(401).json({message:'Invalid email or password'});
 if(!DEMO_AUTH && u.password!==hash(password)) return res.status(401).json({message:'Invalid email or password'});
 res.json({token:token(u),user:{id:u.id,name:u.name,email:u.email},profile:db.profiles[u.id]||{}});
});
app.get('/api/me',auth,(req,res)=>{const db=readDb();const u=db.users.find(x=>x.id===req.user.id);res.json({user:{id:u.id,name:u.name,email:u.email},profile:db.profiles[u.id]||{}})});
app.put('/api/profile',auth,(req,res)=>{const db=readDb();db.profiles[req.user.id]={...(db.profiles[req.user.id]||{}),...req.body,updatedAt:new Date().toISOString()};writeDb(db);res.json(db.profiles[req.user.id]);});
app.get('/api/dashboard',auth,(req,res)=>{const db=readDb();const p=db.profiles[req.user.id]||{};const budget=Number(p.budget||500000);const revenue=Number(p.monthlyRevenue||150000);const costs=Number(p.monthlyCosts||90000);const profit=revenue-costs;res.json({profile:p,kpis:{monthlyRevenue:revenue,monthlyCosts:costs,monthlyProfit:profit,profitMargin:revenue?Math.round(profit/revenue*100):0,feasibility:Math.max(35,Math.min(96,Math.round(55+(profit/Math.max(revenue,1))*40))),risk:profit>0?'Moderate':'High'},trend:[{month:'Jan',revenue:revenue*.82,profit:profit*.72},{month:'Feb',revenue:revenue*.9,profit:profit*.82},{month:'Mar',revenue:revenue*.96,profit:profit*.9},{month:'Apr',revenue,profit}],competitors:[{name:'Local Leader',distance:'0.8 km',rating:4.5,price:'₹₹',gap:'Strong brand'},{name:'Nearby Store',distance:'1.6 km',rating:4.1,price:'₹',gap:'Low digital presence'},{name:'Market Hub',distance:'2.3 km',rating:4.3,price:'₹₹',gap:'High footfall'}],recommendations:['Validate demand with 10–20 customer conversations','Compare competitor pricing and peak hours','Check top matched government schemes','Keep at least 3 months of working capital']});});
app.get('/api/schemes',auth,(req,res)=>{const db=readDb();res.json({schemes:schemeMatch(db.profiles[req.user.id]||{})});});
app.get('/api/schemes/all',auth,(req,res)=>res.json({schemes:getSchemes()}));
app.post('/api/chat',auth,async(req,res)=>{const db=readDb();const p=db.profiles[req.user.id]||{};const {message}=req.body;if(!message)return res.status(400).json({message:'Message required'});const answer=await chat(message,p);db.chats[req.user.id]=[...(db.chats[req.user.id]||[]),{role:'user',content:message,at:new Date().toISOString()},{role:'assistant',content:answer,at:new Date().toISOString()}].slice(-40);writeDb(db);res.json({answer});});
app.get('/api/chat',auth,(req,res)=>{const db=readDb();res.json({messages:db.chats[req.user.id]||[]});});
app.post('/api/tinyfish',auth,async(req,res)=>res.json(await tinyfishTask(req.body.query,readDb().profiles[req.user.id]||{})));
app.post('/api/loan-calculator',auth,(req,res)=>{
 const principal=Math.max(0,Number(req.body?.principal||0));
 const annualRate=Math.max(0,Number(req.body?.annualRate||0));
 const years=Math.max(0,Number(req.body?.years||0));
 if(!principal||!years) return res.status(400).json({message:'Enter loan amount and tenure.'});
 const n=Math.round(years*12), r=annualRate/1200;
 const emi=r===0?principal/n:principal*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
 const total=emi*n;
 res.json({principal,annualRate,years,months:n,emi:Math.round(emi),totalPayment:Math.round(total),totalInterest:Math.round(total-principal)});
});
app.post('/api/market-search',auth,async(req,res)=>{
 const db=readDb(); const profile=db.profiles[req.user.id]||{};
 const query=String(req.body?.query||'').trim();
 if(!query) return res.status(400).json({message:'Enter a market or competitor query.'});
 res.json(await tinyfishTask(query,profile));
});
app.post('/api/analyze',auth,(req,res)=>{const p=req.body.profile||readDb().profiles[req.user.id]||{};const revenue=Number(p.monthlyRevenue||0),costs=Number(p.monthlyCosts||0),budget=Number(p.budget||0);const profit=revenue-costs;const score=Math.max(20,Math.min(95,Math.round(50+(profit/Math.max(revenue,1))*35+(budget>0?10:0))));const swot={strengths:['Clear local customer need','Ability to personalize offerings'],weaknesses:['Limited initial capital','Dependence on local demand'],opportunities:['Government schemes and formal credit','Digital discovery and local partnerships'],threats:['Established competitors','Demand and cost fluctuations']};res.json({score,profit,monthlyRevenue:revenue,monthlyCosts:costs,breakEvenMonths:profit>0?Math.ceil(budget/profit):null,swot,verdict:score>=70?'Promising — proceed with validation and controlled investment.':score>=50?'Potential — validate demand and improve unit economics.':'High risk — revise costs, demand assumptions and funding plan.'});});
app.post('/api/reports',auth,(req,res)=>{const db=readDb();const r={id:id(),userId:req.user.id,title:req.body.title||'SARATHI Business Feasibility Report',createdAt:new Date().toISOString(),payload:req.body.payload||{}};db.reports.push(r);writeDb(db);res.json(r);});
app.get('/api/reports',auth,(req,res)=>{const db=readDb();res.json({reports:db.reports.filter(r=>r.userId===req.user.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))});});
app.use((err,req,res,next)=>{console.error(err);if(res.headersSent)return next(err);res.status(500).json({message:'Server error',detail:process.env.NODE_ENV==='development'?err.message:undefined});});
app.use((req,res)=>res.status(404).json({message:'API route not found',path:req.path}));
app.listen(PORT,()=>console.log(`SARATHI backend running on http://localhost:${PORT}`));
