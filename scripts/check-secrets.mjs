// Read-only check; reports paths and categories, never credential values.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
const files=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))];
const secrets=[];
for(const file of ['.env','backend/.env']){
 if(!existsSync(file)||!statSync(file).isFile())continue;
 for(const match of readFileSync(file,'utf8').matchAll(/^(PINATA_JWT|MODEL_MASTER_KEY|SEPOLIA_PRIVATE_KEY)\s*=\s*(.*)$/gm)){
   const value=match[2].trim().replace(/^['"]|['"]$/g,'');if(value.length>=24)secrets.push(value);
 }
}
const hits=[];
for(const file of files){
 if(!existsSync(file)||!statSync(file).isFile())continue;
 if(/(^|\/)\.env($|\.)/.test(file)&&!file.endsWith('.env.example')){hits.push(`${file}: environment file tracked`);continue;}
 const text=readFileSync(file,'utf8');if(text.includes('\0'))continue;
 if(secrets.some(value=>text.includes(value)))hits.push(`${file}: ignored environment credential copied into source`);
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sb_secret_[A-Za-z0-9_-]{20,}/.test(text))hits.push(`${file}: credential pattern`);
 for(const token of text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]){
   try{if(JSON.parse(Buffer.from(token.split('.')[1],'base64url')).role==='service_role')hits.push(`${file}: Supabase service-role token`);}catch{}
 }
}
if(hits.length){console.error(hits.join('\n'));process.exitCode=1;}else console.log('PASS: tracked/unignored files contain no detected credentials or tracked private environment files.');
