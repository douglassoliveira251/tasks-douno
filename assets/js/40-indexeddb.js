/* ===================== INDEXEDDB (handle do arquivo entre sessões) ===================== */
export function openHandleDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('tyvraTasksDB', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('handles'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function idbGetHandle(key){
  try{
    const db = await openHandleDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('handles','readonly');
      const req = tx.objectStore('handles').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }catch(e){ return null; }
}
export async function idbSetHandle(key, handle){
  try{
    const db = await openHandleDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('handles','readwrite');
      tx.objectStore('handles').put(handle, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }catch(e){ console.error(e); }
}
export async function idbDeleteHandle(key){
  try{
    const db = await openHandleDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('handles','readwrite');
      tx.objectStore('handles').delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }catch(e){ console.error(e); }
}

