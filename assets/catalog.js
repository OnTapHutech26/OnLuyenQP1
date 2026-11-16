/* JSON files are the sole source of course availability and questions. */
(()=>{
  const files={qp:'ngan_hang_quoc_phong.json',philosophy:'ngan_hang_triet_hoc_2000.json',example:'example_demo.json'};
  const data=new Map(),errors=new Map();
  const tasks=Object.entries(files).map(async([id,file])=>{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch('./'+file+'?check='+Date.now(),{cache:'no-store',signal:controller.signal});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const bank=await response.json();
      if(id==='qp'?(bank.subject!=='qp'||!Array.isArray(bank.banks)||!bank.banks.length):(!Array.isArray(bank.questions)||!bank.questions.length))throw new Error('Ngân hàng không hợp lệ');
      data.set(id,bank);
    }catch(error){errors.set(id,error);}finally{clearTimeout(timeout);}
  });
  const ready=Promise.all(tasks);
  window.StudyCatalog={ready,files,has:id=>data.has(id),ids:()=>[...data.keys()],
    disable(id){data.delete(id);document.querySelector(`[data-home-action="${id}"]`)?.setAttribute('hidden','');},
    async get(id){await ready;if(!data.has(id))throw errors.get(id)||new Error('Môn học không có ngân hàng');return data.get(id);}
  };
})();
