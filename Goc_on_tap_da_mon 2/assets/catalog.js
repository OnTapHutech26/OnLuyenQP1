/* File list is generated on each Pages build, never hand-maintained per course. */
(()=>{
  const data=new Map(),errors=new Map(),files=Object.create(null);
  let registry=Object.create(null),catalogError=null;
  async function json(url){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);return await response.json();}finally{clearTimeout(timeout);}}
  const ready=(async()=>{
    try{
      const [modeList,catalog]=await Promise.all([json('./study_modes.json'),json('./banks/catalog.json')]);
      registry=BankEngine.normalizeRegistry(modeList);
      if(!Array.isArray(catalog.banks))throw Error('Danh sách môn học không hợp lệ.');
      await Promise.all(catalog.banks.map(async item=>{
        const file=item.file;
        if(typeof file!=='string'||!file.startsWith('banks/')||file.split('/').some(x=>x==='..'||x==='')||/[?#\\]/.test(file)){errors.set(String(file),'Đường dẫn ngân hàng không hợp lệ.');return;}
        try{
          const path=file.split('/').map(encodeURIComponent).join('/');
          const bank=BankEngine.normalizeBank(await json('./'+path+'?v='+encodeURIComponent(item.sha256||'')),registry);
          if(item.id&&item.id!==bank.id)throw Error('Mã môn không khớp danh sách.');
          if(data.has(bank.id))throw Error('Mã môn bị trùng: '+bank.id);
          files[bank.id]=file;data.set(bank.id,bank);
        }catch(error){errors.set(item.id||file,error.message||String(error));}
      }));
      const ordered=catalog.banks.map(x=>data.get(x.id)).filter(Boolean);data.clear();ordered.forEach(b=>data.set(b.id,b));
    }catch(error){catalogError=error.message||String(error);}
  })();
  window.StudyCatalog={ready,files,has:id=>data.has(id),ids:()=>[...data.keys()],modes:()=>registry,errors:()=>Object.fromEntries(errors),error:()=>catalogError,
    disable(id){data.delete(id);document.querySelector(`[data-home-action="${id}"]`)?.setAttribute('hidden','');},
    async get(id){await ready;if(!data.has(id))throw Error(errors.get(id)||'Môn học không có ngân hàng.');return data.get(id);}
  };
})();
