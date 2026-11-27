#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('../assets/bank-engine.js');
const ROOT=path.resolve(__dirname,'..');
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function bankFiles(directory){
  const result=[];for(const item of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    if(item.name.startsWith('.')||item.isSymbolicLink())continue;
    const target=path.join(directory,item.name);
    if(item.isDirectory())result.push(...bankFiles(target));
    else if(item.isFile()&&item.name.endsWith('.json')&&item.name!=='catalog.json')result.push(target);
  }return result;
}
function generateCatalog(root=ROOT){
  const registry=E.normalizeRegistry(read(path.join(root,'study_modes.json'))),ids=new Set(),banks=[];
  for(const file of bankFiles(path.join(root,'banks'))){
    const relative=path.relative(root,file).split(path.sep).join('/');
    try{
      const raw=read(file),bank=E.normalizeBank(raw,registry);
      if(ids.has(bank.id))throw Error('Mã môn '+bank.id+' đang được dùng ở hai file.');ids.add(bank.id);
      banks.push({id:bank.id,title:bank.title,file:relative,questionCount:bank.questions.length,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
    }catch(error){throw Error(relative+': '+error.message);}
  }
  banks.sort((a,b)=>a.title.localeCompare(b.title,'vi'));
  const catalog={schemaVersion:1,generatedAt:new Date().toISOString(),banks};
  const target=path.join(root,'banks/catalog.json');fs.writeFileSync(target+'.tmp',JSON.stringify(catalog,null,2)+'\n');fs.renameSync(target+'.tmp',target);
  return catalog;
}
function build(root=ROOT,destination=path.join(root,'_site')){
  const catalog=generateCatalog(root);fs.rmSync(destination,{recursive:true,force:true});fs.mkdirSync(destination,{recursive:true});
  for(const name of ['index.html','study_modes.json','assets','banks'])fs.cpSync(path.join(root,name),path.join(destination,name),{recursive:true});
  if(fs.existsSync(path.join(root,'CNAME')))fs.copyFileSync(path.join(root,'CNAME'),path.join(destination,'CNAME'));
  fs.writeFileSync(path.join(destination,'.nojekyll'),'');
  return catalog;
}
if(require.main===module){try{const catalog=process.argv.includes('--catalog-only')?generateCatalog():build();console.log('Ready: '+catalog.banks.length+' môn, '+catalog.banks.reduce((n,b)=>n+b.questionCount,0)+' câu.');}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={generateCatalog,build,bankFiles};
