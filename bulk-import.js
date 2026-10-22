// Importación masiva POLADENT: CSV UTF-8 y fotografías locales sin servicios nuevos.
// Se valida toda la tabla antes de subir una sola imagen. Se importa por bloques.
function simple(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function key(value) { return simple(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
export function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/, 1)[0] || '';
  const separator = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  let quoted = false, token = '', record = [], result = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { token += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === separator && !quoted) {
      record.push(token.trim()); token = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i+1] === '\n') i++;
      record.push(token.trim()); token = '';
      if (record.some(v => v !== '')) result.push(record);
      record = [];
    } else token += ch;
  }
  if (quoted) throw Error('Hay comillas sin cerrar en el CSV. Revisa la tabla.');
  record.push(token.trim());
  if (record.some(v => v !== '')) result.push(record);
  return result;
}
const aliases = {
  codigo: 'codigo', cod: 'codigo', sku: 'codigo', referencia: 'codigo',
  nombre: 'nombre', producto: 'nombre', nombre_del_producto: 'nombre',
  marca: 'marca', brand: 'marca',
  descripcion: 'descripcion', detalle: 'descripcion',
  estado: 'estado', disponibilidad: 'estado', status: 'estado',
  area: 'area_id', area_id: 'area_id', area_del_producto: 'area_id', categoria: 'area_id',
  foto: 'foto', archivo: 'foto', imagen: 'foto',
  imagen_archivo: 'foto', archivo_imagen: 'foto', fotografia: 'foto',
  imagen_url: 'imagen_url', url_imagen: 'imagen_url',
  enlace_imagen: 'imagen_url', enlace: 'imagen_url', link: 'imagen_url',
  orden: 'orden', sort_order: 'orden'
};
function normalizeHeader(value) { return aliases[simple(value).replace(/[^a-z0-9]+/g, '_')] || ''; }
function normalizeStatus(value) {
  const s = simple(value).replace(/[\s_-]+/g, ' ');
  if (['','disponible','available','en stock','activo'].includes(s)) return 'available';
  if (['agotado','sold out','sin stock','no disponible'].includes(s)) return 'sold_out';
  if (['oculto','hidden','ocultar','inactivo'].includes(s)) return 'hidden';
  return null;
}
function safeHttps(url) {
  try {const u = new URL(url); return u.protocol === 'https:' && !!u.hostname;}
  catch {return false;}
}
function sameProduct(p) { return key(p.brand) + '|' + key(p.name); }
function safeImageName(name) { return simple(name.replace(/\\/g, '/').split('/').pop()); }
export function readEntries(text) {
  const table = parseCSV(text);
  if (!table.length) throw Error('El archivo CSV está vacío.');
  const head = table.shift().map(normalizeHeader);
  for (const field of ['nombre','marca']) {
    if (!head.includes(field)) throw Error('Falta la columna ' + field + ' en el CSV.');
  }
  if (!head.includes('foto') && !head.includes('imagen_url')) {
    throw Error('La tabla necesita una columna foto o imagen_url.');
  }
  if (table.length > 200) throw Error('El máximo es 200 productos por archivo CSV. Divide la tabla en varios archivos.');
  if (!table.length) throw Error('La tabla no tiene productos. Rellena las filas debajo de la cabecera.');
  const errors = [], entries = [], seen = new Set();
  for (let i = 0; i < table.length; i++) {
    const raw = table[i], entry = {};
    for(let j=0;j<head.length;j++)if(head[j])entry[head[j]]=(raw[j] || '').trim();
    const row = i + 2;
    const name = entry.nombre || '', brand = entry.marca || '';
    const status = normalizeStatus(entry.estado || '');
    const filename = entry.foto || '', imageUrl = entry.imagen_url || '';
    const areaId = String(entry.area_id || '').trim();
    if (!name || !brand || name.length > 180 || brand.length > 80) errors.push('Fila ' + row + ': nombre o marca vacíos o demasiado largos.');
    if ((entry.descripcion || '').length > 1000) errors.push('Fila ' + row + ': descripción de más de 1000 caracteres.');
    if (!status) errors.push('Fila ' + row + ': estado desconocido (' + entry.estado + ').');
    if (areaId && !/^[a-z0-9-]{1,55}$/.test(areaId)) errors.push('Fila ' + row + ': area_id debe usar letras minúsculas, números o guiones.');
    if (!filename && !imageUrl) errors.push('Fila ' + row + ': añade foto o imagen_url.');
    if (imageUrl && !safeHttps(imageUrl)) errors.push('Fila ' + row + ': imagen_url debe comenzar por https://.');
    if ((entry.orden || '') && (!/^\d+$/.test(entry.orden) || Number(entry.orden)>100000)) errors.push('Fila '+row+': orden debe ser número entre 0 y 100000.');
    const dedupKey = key(brand) + '|' + key(name);
    if (seen.has(dedupKey)) errors.push('Fila ' + row + ': nombre y marca repetidos dentro del CSV.');
    seen.add(dedupKey);
    entries.push({
      name, brand, description: entry.descripcion || '', status: status || 'available',
      area_id: areaId,
      sort_order: Number(entry.orden) || 0,
      image_file_name: filename, image_url: imageUrl,
      source_key: 'csv-' + key(brand) + '-' + key(entry.codigo || name)
    });
  }
  if (errors.length) throw Error(errors.slice(0, 6).join('  ') + (errors.length>6?'  Y '+(errors.length-6)+' errores más.':''));
  return entries;
}

export function initBulkImport({getProducts, refresh, lock, uploadImage, removeImage, importProducts, tell}) {
  const input = document.querySelector('#bulk-csv'), images = document.querySelector('#bulk-images');
  const preview = document.querySelector('#bulk-preview'), progress = document.querySelector('#bulk-progress');
  const start = document.querySelector('#bulk-start');
  let entries = [], candidates = [], fileMap = new Map(), valid = false;
  async function update(resetProgress = true) {
    start.disabled = true; valid = false; entries = []; candidates = [];
    if (resetProgress) progress.textContent = '';
    if (!input.files?.length) {
      preview.textContent = 'Selecciona un CSV para comenzar.'; return;
    }
    try {
      entries = readEntries(await input.files[0].text());
      fileMap = new Map();
      for(const file of [...images.files]) {
        if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('La foto '+file.name+' no es JPG, PNG ni WebP.');
        const k = safeImageName(file.name);
        if(fileMap.has(k))throw Error('Seleccionaste varias fotos con el mismo nombre: '+file.name);
        fileMap.set(k,file);
      }
      const existing = new Set(getProducts().map(sameProduct));
      const sourceKeys = new Set(getProducts().map(p=>p.source_key).filter(Boolean));
      candidates = entries.filter(row => !existing.has(sameProduct(row)) && !sourceKeys.has(row.source_key));
      const absent = candidates.filter(row => !row.image_url && !fileMap.has(safeImageName(row.image_file_name)));
      if (absent.length) throw Error('Faltan '+absent.length+' fotos. Selecciona las imágenes de: '+absent.slice(0,4).map(p=>p.name+' ('+p.image_file_name+')').join(', ')+'.');
      valid = candidates.length > 0;
      preview.textContent = entries.length + ' filas revisadas. '+(entries.length-candidates.length)+' productos ya existentes (se omiten). '+candidates.length+' nuevos para importar. '+candidates.filter(p=>!p.image_url).length+' fotos para subir a Cloudinary. No se modificarán los existentes.';
      start.disabled = !valid;
    } catch(error) {
      preview.textContent = 'Revisa el archivo: ' + error.message;
      start.disabled = true; valid = false;
    }
  }
  input.addEventListener('change',update);
  images.addEventListener('change',update);
  start.onclick=async()=>{
    if(!valid || !candidates.length) return;
    if(!confirm('¿Importar '+candidates.length+' productos NUEVOS? Los productos existentes conservarán sus datos y fotografías.'))return;
    lock(true);
    let imported=0, photos=0, failedCleanup=0;
    const scheduled=[...candidates];
    try {
      // Cada lote escribe como máximo 25 productos en una única transacción de Firestore.
      // Si falla la subida de una foto o la escritura, se limpian las subidas NO publicadas.
      for(let startIndex=0; startIndex<scheduled.length; startIndex+=25) {
        const group=scheduled.slice(startIndex,startIndex+25), uploads=[], rows=[];
        let committed=false;
        try {
          for(const p of group) {
            const row={...p};
            delete row.image_file_name;
            if(!row.image_url) {
              progress.textContent='Subiendo foto '+(photos+1)+' de '+scheduled.filter(x=>!x.image_url).length+': '+p.name;
              const saved=await uploadImage(fileMap.get(safeImageName(p.image_file_name)));
              uploads.push(saved);
              row.image_url=saved.url; row.image_path=saved.path;
              photos++;
            }
            rows.push(row);
          }
          progress.textContent='Guardando productos '+(startIndex+1)+' a '+(startIndex+group.length)+' de '+scheduled.length+'…';
          await importProducts(rows);
          committed=true;imported+=rows.length;
        } finally {
          if(!committed)for(const image of uploads) {
            try{await removeImage(image.path);}
            catch{failedCleanup++;}
          }
        }
      }
      progress.textContent='Importación terminada: '+imported+' productos nuevos guardados y '+photos+' fotos subidas.';
      tell('Se importaron '+imported+' productos correctamente. Los anteriores se conservaron.');
    } catch(error) {
      progress.textContent='Importación detenida. '+imported+' productos ya quedaron guardados. Error: '+error.message+(failedCleanup?' Atención: '+failedCleanup+' fotografías requieren limpieza manual en Cloudinary.':'');
      tell('Importación parcial: revisa el informe en Importar muchos productos.',true);
    } finally {
      lock(false);
      try { await refresh(); await update(false); }
      catch(error) { progress.textContent += ' No se actualizó la lista: '+error.message; }
    }
  };
}
