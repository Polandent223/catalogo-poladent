import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const load=async name=>{
  let source=read(name);
  if(name==='storefront-settings.js')
    source=source.replace("import {QUICK_AREAS} from './catalog-quick-search.js';",
      read('catalog-quick-search.js').replaceAll('export ',''));
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
};
const {STORE_DEFAULTS,STORE_THEMES,normalizeStorefront,secureBannerURL}=await load('storefront-settings.js');
const {parseCatalogDocuments}=await load('catalog-public-data.js');
const {bannerImageForViewport}=await load('banner-slides.js');
const dualBanner={desktop_url:'https://example.com/escritorio.webp',mobile_url:'https://example.com/telefono.webp'};
assert.equal(bannerImageForViewport(dualBanner,false),dualBanner.desktop_url);
assert.equal(bannerImageForViewport(dualBanner,true),dualBanner.mobile_url);
assert.equal(bannerImageForViewport({desktop_url:dualBanner.desktop_url},true),dualBanner.desktop_url,
  'Si falta la imagen móvil, debe avanzar usando la de PC');
assert.equal(bannerImageForViewport({mobile_url:dualBanner.mobile_url},false),dualBanner.mobile_url,
  'Si falta la imagen PC, debe utilizar la de móvil');
assert.equal(bannerImageForViewport(null,true),'');


const publicBannerJS=read('public-catalog.js'),responsiveStyles=read('catalog-style.css');
assert.ok(publicBannerJS.includes("bannerMobileViewport.matches"),
  'En Android se debe cambiar directamente el IMG por la imagen del teléfono');
assert.ok(publicBannerJS.includes("source.removeAttribute('srcset')"),
  'No depender de la mutación de picture/source para pasar al siguiente banner');
assert.ok(publicBannerJS.includes("window.setTimeout"),
  'El carrusel debe programar cada paso en móviles y PC');
assert.ok(publicBannerJS.includes("bannerMobileViewport.addEventListener('change',paintBannerSlide)"),
  'Al girar el teléfono se debe actualizar la imagen');
assert.ok(responsiveStyles.includes('body.storefront-active.storefront-theme-premium-compacta #brand-hero:not([hidden])'),
  'El selector de marca debe tener una tarjeta horizontal de ancho controlado');
assert.ok(responsiveStyles.includes('max-height:min(60dvh,450px);object-fit:contain'),
  'Las fotos del móvil deben conservar su composición original');

const original=normalizeStorefront();
assert.equal(original.enabled,false,'Por defecto nadie ve el rediseño hasta la aprobación');
assert.equal(original.theme,'premium','Conservar como predeterminada la propuesta aprobada');
assert.deepEqual(STORE_THEMES,['premium','clinica','minimalista','comercial','premium-confianza','premium-compacta']);
for(const theme of STORE_THEMES){
  const selected=normalizeStorefront({
    ...STORE_DEFAULTS,theme,
    title:'Título personalizado',banner_mobile_url:'https://example.com/portada-movil.webp',
    trust_items:['Primer mensaje','Segundo mensaje','Tercer mensaje'],
    featured_brands:['ICE','ADALTA']
  });
  assert.equal(selected.theme,theme);
  assert.equal(selected.title,'Título personalizado','Cambiar la plantilla no modifica textos');
  assert.equal(selected.banner_mobile_url,'https://example.com/portada-movil.webp',
    'Cambiar la plantilla no modifica banners');
  assert.deepEqual(selected.featured_brands,['ICE','ADALTA']);
  assert.deepEqual(selected.trust_items,['Primer mensaje','Segundo mensaje','Tercer mensaje']);
}
assert.equal(normalizeStorefront({theme:'unsupported'}).theme,'premium');
assert.equal(normalizeStorefront({theme:'premium; color:red'}).theme,'premium');
assert.equal(normalizeStorefront({}).theme,'premium','Los ajustes viejos deben conservar su apariencia');
assert.match(original.title,/odontología/);
assert.equal(original.trust_items.length,3);
assert.equal(original.featured_brands.length,3);
assert.equal(secureBannerURL('javascript:alert(1)'),'');
assert.equal(secureBannerURL('http://example.com/banner.png'),'');
assert.equal(secureBannerURL('https://example.com/a.webp'),'https://example.com/a.webp');
assert.equal(secureBannerURL('https://user:pass@example.com/x.webp'),'');
assert.equal(secureBannerURL('blob:https://example.com/a'), '');
assert.equal(secureBannerURL('blob:https://example.com/a',true),'blob:https://example.com/a');
const candidate=normalizeStorefront({
  enabled:true,theme:'clinica',title:'Nueva vitrina POLADENT',
  eyebrow:'OFERTAS SIN PRECIOS', subtitle:'Laboratorio e instrumental.',
  banner_desktop_url:'https://example.com/pc.webp',
  banner_mobile_url:'https://example.com/mobile.webp',
  trust_items:['Asesoría','Cotización','Envíos'],
  featured_brands:['ICE','ADALTA','ICE','EASYINSMILE','VRC','IMODONTO']
});
assert.equal(candidate.enabled,true);
assert.equal(candidate.theme,'clinica');
assert.equal(candidate.title,'Nueva vitrina POLADENT');
assert.equal(candidate.banner_mobile_url,'https://example.com/mobile.webp');
assert.deepEqual(candidate.trust_items,['Asesoría','Cotización','Envíos']);
assert.deepEqual(candidate.featured_brands,['ICE','ADALTA','EASYINSMILE']);
const untrusted=normalizeStorefront({
  enabled:'true',title:'x'.repeat(150),
  banner_mobile_url:'javascript:alert(1)',
  featured_brands:['ICE',''],
  trust_items:['texto\nsegundo']
});
assert.equal(untrusted.enabled,false);
assert.equal(untrusted.theme,'premium');
assert.equal(untrusted.title,STORE_DEFAULTS.title);
assert.equal(untrusted.banner_mobile_url,'');
assert.equal(untrusted.trust_items[0],'texto segundo');

const str=s=>({stringValue:s});
const contents=[
  {name:'projects/example/databases/(default)/documents/catalogPublic/_catalog_contacts',
   fields:{
     kind:str('contact_settings'),status:str('available'),
     contacts:{arrayValue:{values:[{mapValue:{fields:{label:str('Valencia'),phone:str('584121234567')}}}]}},
     storefront:{mapValue:{fields:{enabled:{booleanValue:true},title:str('Nueva vitrina POLADENT'),banner_mobile_url:str('https://example.com/mobile.webp')}}}
   }
  },
  {name:'projects/example/databases/(default)/documents/catalogPublic/p-ice',
   fields:{name:str('Forceps'),brand:str('ICE'),status:str('available'),image_url:str('https://example.com/forceps.webp')}}
];
const parsed=parseCatalogDocuments(contents);
assert.equal(parsed.contacts.length,1);
assert.equal(parsed.contacts[0].label,'Valencia');
assert.equal(parsed.products.length,1);
assert.equal(parsed.storefront.enabled,true);
assert.equal(parsed.storefront.title,'Nueva vitrina POLADENT');
assert.equal(parsed.storefront.banner_mobile_url,'https://example.com/mobile.webp');

const page=read('index.html');
const publicCode=read('public-catalog.js');
const style=read('catalog-style.css');
const adminPage=read('diseno.html');
const adminCode=read('design-admin.js');
const backend=read('firebase-client.js');
const service=read('catalog-service.js');
for (const id of ['storefront-home','storefront-hero','storefront-title','storefront-subtitle',
  'storefront-primary','storefront-secondary','storefront-trust-1','storefront-trust-2',
  'storefront-trust-3','storefront-featured-grid','storefront-brands-title',
  'storefront-mobile-source','storefront-banner']){
  assert.ok(page.includes('id="'+id+'"'),'Falta sección en catálogo: '+id);
}
assert.ok(page.includes('id="cart-open"'),'Mantener el carrito');
assert.ok(page.includes('id="inquiry-whatsapp"'),'Mantener consulta individual');
assert.ok(page.includes('id="quote-timing"'),'Mantener intención de compra');
assert.ok(page.includes('id="welcome-screen"'),'No cambiar portada de bienvenida');
assert.ok(page.includes('id="storefront-home" class="storefront-home" aria-label="Presentación comercial POLADENT" hidden'),
  'La vista previa no debe activarse automáticamente');
assert.ok(publicCode.includes("new URLSearchParams(location.search).get('vista')==='1'"));
assert.ok(publicCode.includes('const design=previewStorefront||values.enabled'));
assert.ok(publicCode.includes("$('.intro').hidden=design"));
assert.ok(publicCode.includes('storefrontSettings=data.storefront'));
assert.ok(publicCode.includes("if(event.origin!==location.origin||event.source!==window.parent"),
  'Bloquear mensajes desde sitios no autorizados');
assert.ok(publicCode.includes('renderStorefront()'));
assert.ok(publicCode.includes("if(design)document.body.classList.add('storefront-theme-'+values.theme)"));
assert.ok(publicCode.includes("for(const name of STORE_THEMES)document.body.classList.remove('storefront-theme-'+name)"),
  'Eliminar la plantilla cuando el diseño está desactivado');
for(const theme of STORE_THEMES){
  assert.ok(style.includes('body.storefront-active.storefront-theme-'+theme),
    'Faltan estilos de la plantilla '+theme);
  assert.ok(adminPage.includes('data-theme="'+theme+'"'),'Falta tarjeta '+theme);
  assert.ok(adminPage.includes('name="theme" value="'+theme+'"'),'Falta control accesible '+theme);
}
assert.ok(style.includes('--sf-hero-bg'),'Los estilos incluyen fondos diferenciados');
assert.ok(style.includes('--sf-primary'),'Los botones incluyen acentos diferenciados');
assert.ok(style.includes('--sf-hero-title'),'Los títulos contrastan en fondos claros y oscuros');
assert.ok(publicCode.includes("window.parent.postMessage({type:'poladent:storefront-ready'},location.origin)"));
assert.ok(style.includes('body.storefront-active'));
assert.ok(style.includes('.storefront-hero'));
assert.ok(style.includes('.storefront-trust'));
assert.ok(style.includes('@media(max-width:700px)'));
for(const id of ['design-enabled','design-desktop-file','design-desktop-url',
  'design-mobile-file','design-mobile-url','design-brands','design-frame','design-save']){
  assert.ok(adminPage.includes('id="'+id+'"'), 'Falta editor: '+id);
}
assert.ok(adminPage.includes('src="./?catalogo=1&amp;vista=1"'));
assert.ok(read('admin.html').includes('href="diseno.html"'));
assert.ok(adminCode.includes('getStorefrontSettings()'));
assert.ok(adminCode.includes("theme:form.elements.namedItem('theme').value"));
assert.ok(adminCode.includes("input[name=\"theme\"][value=\"'+published.theme+'\"]"),
  'Restaurar la plantilla elegida desde Firebase');
assert.ok(adminCode.includes("frame.contentWindow.postMessage({type:'poladent:storefront-draft',settings}"),
  'Cambiar de plantilla debe verse en tiempo real en el teléfono');
assert.ok(adminPage.includes('id="design-theme-description"'));
assert.ok(adminPage.includes('id="design-enabled"'),'No activar plantilla al escogerla');
assert.ok(adminCode.includes('saveStorefrontSettings(requested)'));
assert.ok(adminCode.includes("type:'poladent:storefront-draft'"));
assert.ok(adminCode.includes('await uploadImage(file)'));
assert.ok(adminCode.includes('URL.createObjectURL(file)'));
assert.ok(adminCode.includes('clearObjectURLs()'));
assert.ok(backend.includes('export async function getStorefrontSettings()'));
const saver=backend.slice(backend.indexOf('export async function saveStorefrontSettings('));
assert.ok(saver.includes("doc(db,'catalogProducts',CONTACTS_DOC),data,{merge:true}"));
assert.ok(saver.includes("doc(db,'catalogPublic',CONTACTS_DOC),data,{merge:true}"));
assert.ok(!saver.includes('batch.delete('));
assert.ok(!saver.includes('deleteDoc('));
assert.ok(!saver.includes('saveProduct('));
assert.ok(saver.includes('await adminCheck()'));
assert.ok(service.includes('client.saveStorefrontSettings(settings)'));

assert.equal(original.locations_enabled,false,'Las sedes nunca se publican por defecto');
assert.equal(original.locations.length,2,'Se preservan las dos sucursales');
assert.equal(original.locations[0].name,'Poladent sede Principal Valencia');
assert.equal(original.locations[1].name,'Poladent sede Maracay');
const safeLocations=normalizeStorefront({locations_enabled:true,locations:[{name:'Nueva sede',city:'Valencia',address:'Calle ejemplo',phone:'584226710634',photo_url:'javascript:alert(1)'}]});
assert.equal(safeLocations.locations_enabled,true);
assert.equal(safeLocations.locations[0].photo_url,'','Rechazar fotos con esquemas inseguros');
assert.ok(page.includes('id="official-locations"'));
assert.ok(publicCode.includes('renderOfficialLocations(values,active)'));
assert.ok(publicCode.includes('active&&values.locations_enabled'));
assert.ok(adminPage.includes('id="design-location-fields"'));
assert.ok(adminCode.includes('locations:readLocations(useFilePreview)'));
assert.ok(style.includes('.official-location-card'));


assert.ok(adminPage.includes('id="design-add-location"'),'Se pueden agregar más sucursales');
assert.ok(adminCode.includes('function appendLocationEditor('),'Deben existir formularios dinámicos de sedes');
assert.ok(adminCode.includes('function getLocationUploadFiles('),'Las fotos locales deben subirse al guardar');
assert.ok(adminCode.includes('locationPhotoPreviews.get(section)'),'Las vistas previas no dependen del orden de las sedes');
assert.ok(publicCode.includes("$('#storefront-locations-link').hidden="),'El botón de sedes permanece oculto hasta activarse');
assert.ok(page.includes('id="storefront-locations-link"'));
const previewLocation=normalizeStorefront({locations:[{name:'Sucursal de prueba',photo_url:'blob:https://example.com/abc'}]},true);
assert.equal(previewLocation.locations[0].photo_url,'blob:https://example.com/abc');
assert.equal(normalizeStorefront({locations:[{name:'Sucursal de prueba',photo_url:'blob:https://example.com/abc'}]}).locations[0].photo_url,'');


// Quinta plantilla: la portada anterior continúa siendo la predeterminada.
assert.equal(original.theme,'premium');
assert.equal(normalizeStorefront({theme:'premium-confianza'}).theme,'premium-confianza');
assert.equal(normalizeStorefront({theme:'otro'}).theme,'premium');
assert.equal(original.about_enabled,true);
assert.equal(original.steps_enabled,true);
assert.equal(original.benefit_items.length,4);
assert.equal(original.steps.length,4);
const copy=normalizeStorefront({
 theme:'premium-confianza', about_title:'Por qué nos eligen',about_text:'Atención en dos tiendas reales',
 benefit_items:[{title:'Compra presencial',text:'Valencia y Maracay'}],
 steps:[{title:'Consultar',text:'Busca tu producto'}],
 closing_title:'Estamos para atenderte',locations_title:'Nuestras tiendas'
});
assert.equal(copy.about_title,'Por qué nos eligen');
assert.equal(copy.benefit_items[0].title,'Compra presencial');
assert.equal(copy.benefit_items.length,4);
assert.equal(copy.steps[0].title,'Consultar');
assert.equal(copy.closing_title,'Estamos para atenderte');
assert.equal(copy.locations_title,'Nuestras tiendas');
assert.ok(adminPage.includes('name="theme" value="premium-confianza"'));
for(const id of ['premium-about','premium-about-title','premium-about-text','premium-benefits','premium-steps','premium-steps-title','premium-steps-grid','premium-closing','premium-hero-photo','premium-closing-whatsapp'])
  assert.ok(page.includes('id="'+id+'"'), 'Falta bloque premium: '+id);
for(const name of ['about_title','about_text','steps_title','closing_title','closing_text','locations_title','locations_intro'])
  assert.ok(adminPage.includes('name="'+name+'"'),'Falta control de texto: '+name);
assert.ok(adminCode.includes("about_title:read('about_title')"));
assert.ok(adminCode.includes("benefit_items:Array.from({length:4}"));
assert.ok(publicCode.includes('function renderPremiumSections('));
assert.ok(publicCode.includes("premium=active&&['premium-confianza','premium-compacta'].includes(values.theme)"));
assert.ok(style.includes('body.storefront-active.storefront-theme-premium-confianza'));


assert.ok(page.includes('id="premium-brand-logo"'));
assert.ok(page.includes('id="storefront-whatsapp"'));
assert.ok(adminPage.includes('id="design-logo-file"'));
assert.ok(adminPage.includes('id="design-logo-url"'));
assert.ok(adminCode.includes('function updateLocalLogo()'));
assert.ok(adminCode.includes('requested.brand_logo_url=uploaded.url'));
assert.equal(normalizeStorefront({brand_logo_url:'javascript:alert(1)'}).brand_logo_url,'');
assert.equal(normalizeStorefront({brand_logo_url:'https://example.com/logo.png'}).brand_logo_url,'https://example.com/logo.png');
assert.ok(saver.includes("'banner_desktop','banner_mobile','brand_logo'"));
assert.equal(original.locations_enabled,false,'No activar las sedes sin la decisión del administrador');

assert.ok(publicCode.includes("['premium-confianza','premium-compacta'].includes(requestedPreviewTheme)"),'La nueva plantilla debe poder examinarse sin publicar');
assert.ok(publicCode.includes("card.classList.toggle('without-photo',photos.length===0)"),'Las sedes funcionan sin fotos');
assert.ok(style.includes('.official-location-card.without-photo'));


// La portada original sigue funcionando hasta una activación expresamente elegida.
assert.equal(original.replace_welcome,false);
assert.equal(normalizeStorefront({theme:'premium-confianza',replace_welcome:true}).replace_welcome,true);
assert.equal(normalizeStorefront({theme:'premium',replace_welcome:true}).replace_welcome,false);
assert.equal(normalizeStorefront({theme:'premium-confianza'}).replace_welcome,false);
assert.ok(adminPage.includes('id="design-replace-welcome"'));
assert.ok(adminCode.includes("replace_welcome:$('#design-replace-welcome').checked"));
const welcome=read('welcome.js');
assert.ok(welcome.includes("storefront.replace_welcome?.booleanValue===true"));
assert.ok(welcome.includes("storefront.enabled?.booleanValue===true"));
assert.ok(welcome.includes("['premium-confianza','premium-compacta'].includes(storefront.theme?.stringValue)"));
assert.ok(welcome.includes('settings?.skip?enterCatalog():settings?showWelcome(settings):enterCatalog()'));


const compact=normalizeStorefront({theme:'premium-compacta'});
assert.equal(compact.theme,'premium-compacta');
assert.equal(compact.enabled,false);
assert.equal(compact.replace_welcome,false);
assert.equal(compact.compact_order_mobile[2],'catalogo','Marcas y productos llegan pronto en móvil');
assert.equal(compact.compact_order_desktop[2],'about','La versión PC prioriza presentación');
assert.equal(compact.compact_mobile_hero_height,280);
assert.equal(compact.compact_desktop_hero_height,430);
assert.equal(normalizeStorefront({theme:'premium-compacta',replace_welcome:true}).replace_welcome,true);
assert.deepEqual(normalizeStorefront({
  compact_order_mobile:['steps','steps','evil','hero','catalogo'],
  compact_hidden_mobile:['catalogo','steps','steps','evil']
}).compact_hidden_mobile,['steps'],'Productos no se pueden ocultar, ni se aceptan nombres desconocidos');
const allSections=['hero','trust','catalogo','about','locations','steps','closing'];
assert.deepEqual(normalizeStorefront({compact_order_mobile:['steps','hero','catalogo']}).compact_order_mobile.slice(0,3),
  ['steps','hero','catalogo'],'Se respeta orden personalizado');
assert.deepEqual([...normalizeStorefront({compact_order_mobile:['steps','hero','catalogo']}).compact_order_mobile].sort(),
  [...allSections].sort(),'Nunca se pierden secciones del catálogo');
assert.equal(normalizeStorefront({compact_mobile_hero_height:900}).compact_mobile_hero_height,280);
assert.equal(normalizeStorefront({compact_desktop_hero_height:-1}).compact_desktop_hero_height,430);
assert.ok(page.includes('id="compact-mobile-title"'));
assert.ok(page.includes('id="compact-mobile-summary"'));
assert.ok(adminPage.includes('name="theme" value="premium-compacta"'));
assert.ok(adminPage.includes('id="compact-mobile-order"'));
assert.ok(adminPage.includes('id="compact-desktop-order"'));
assert.ok(adminPage.includes('id="design-preview-mobile"'));
assert.ok(adminPage.includes('id="design-preview-desktop"'));
assert.ok(adminCode.includes('function renderCompactOrder(device)'));
assert.ok(adminCode.includes('compact_order_mobile:[...compactOrderMobile]'));
assert.ok(adminCode.includes('compact_order_desktop:[...compactOrderDesktop]'));
assert.ok(publicCode.includes('function applyCompactLayout(values,active)'));
assert.ok(publicCode.includes("catalogo:['.brands-area','#brand-hero','#quick-areas','.filters','.cart-toolbar'"));
assert.ok(!publicCode.includes('main.appendChild(\'#products\')'));
assert.ok(style.includes('body.storefront-active.storefront-theme-premium-compacta main'));
assert.ok(style.includes('order:var(--compact-mobile-order,4)'));
assert.ok(style.includes('order:var(--compact-desktop-order,4)'));
assert.ok(style.includes('[data-compact-hide-mobile="1"]'));
assert.ok(style.includes('[data-compact-hide-desktop="1"]'));
assert.ok(style.includes('scroll-snap-type:x proximity'));

assert.ok(publicCode.includes("locationsLink.dataset.compactHideMobile='1'"));
assert.ok(publicCode.includes("locationsLink.dataset.compactHideDesktop='1'"));


const quick=await load('catalog-quick-search.js');
assert.ok(quick.QUICK_AREAS.length>=5,'Hay accesos rápidos para distintas áreas');
const sampleItems=[
 {name:'Limas endodónticas 25 mm',brand:'ADALTA',status:'available'},
 {name:'Brackets ortodoncia metálicos',brand:'DENCO',status:'available'},
 {name:'Fresas carburo dental',brand:'ICE',status:'available'},
 {name:'Cureta Gracey',brand:'ADALTA',status:'sold_out'}
];
const areas=quick.quickAreaCounts(sampleItems);
assert.equal(areas.endodoncia,1);
assert.equal(areas.ortodoncia,1);
assert.equal(areas.instrumental,1);
assert.equal(quick.quickAreasForProduct({name:'Lámpara de fotocurado'}).includes('equipos'),true);
assert.equal(quick.quickAreasForProduct({name:'Una categoría inventada'}).length,0);
assert.ok(page.includes('id="quick-areas"')&&page.includes('id="quick-area-buttons"'));
assert.ok(page.includes('id="inquiry-quick"'));
assert.ok(page.includes('RIF J-401910769'));
assert.ok(!page.includes('<a href="admin.html">Administración</a>'),'Ocultar enlace administrativo en el sitio público');
assert.ok(publicCode.includes('function renderQuickAreas()'));
assert.ok(publicCode.includes('quickAreasForProduct(p,currentQuickAreas,currentQuickAuto).includes(activeQuickArea)'));
assert.ok(publicCode.includes('function refreshQuickInquiry()'));
assert.ok(publicCode.includes("catalogo:['.brands-area','#brand-hero','#quick-areas'"));
assert.ok(publicCode.includes("field.primary='Ver productos'"));
assert.ok(style.includes('.quick-area-buttons'));
assert.ok(style.includes('.inquiry-quick'));


const businessMatch=page.split('<script type="application/ld+json" id="poladent-business-schema">')[1]?.split('</script>')[0];
assert.ok(businessMatch,'Datos públicos de empresa');
const business=JSON.parse(businessMatch);
assert.equal(business.taxID,'J-401910769');
assert.equal(business.location.length,2);
assert.deepEqual(business.location.map(x=>x.address.addressLocality),['Valencia','Maracay']);
assert.ok(!JSON.stringify(business).includes('aggregateRating'),'Nunca inventar valoración');

assert.equal(original.locations[0].interior_url,'');
assert.equal(original.locations[1].interior_url,'');
assert.equal(normalizeStorefront({locations:[{
  name:'Sucursal de prueba',photo_url:'https://example.org/foto.webp',
  interior_url:'https://example.org/interior.webp'
}]}).locations[0].interior_url,'https://example.org/interior.webp');
assert.equal(normalizeStorefront({locations:[{
  name:'Sucursal de prueba',interior_url:'javascript:alert(1)'
}]}).locations[0].interior_url,'');
const previewInterior=normalizeStorefront({locations:[{
  name:'Sucursal de prueba',interior_url:'blob:https://example.com/abc'
}]},true);
assert.equal(previewInterior.locations[0].interior_url,'blob:https://example.com/abc');
assert.ok(adminCode.includes("'photo_url','interior_url'"));
assert.ok(adminCode.includes("file.dataset.locationPhoto=key"));
assert.ok(adminCode.includes("requested.locations[i][key]=uploaded.url"));
assert.ok(publicCode.includes("url:location.interior_url"));
assert.ok(publicCode.includes("'official-location-photos'"));
assert.ok(publicCode.includes("gallery.classList.toggle('has-two',photos.length>=2)"));
assert.ok(style.includes('.official-location-photos.has-two'));


assert.ok(adminPage.includes('id="design-location-pack"'));
assert.ok(adminCode.includes("$('#design-location-pack').addEventListener('change'"));
assert.ok(adminCode.includes("selected.items.add(file)"));
assert.ok(adminCode.includes("assigned+' fotografías asignadas"));


const galleryValues=normalizeStorefront({locations:[{
  name:'Sucursal real',gallery_urls:[
    'https://example.com/tercera.jpg','javascript:alert(1)','http://insecure.example/x.jpg',
    'https://example.com/cuarta.jpg'
  ]
}]});
assert.deepEqual(galleryValues.locations[0].gallery_urls,
  ['https://example.com/tercera.jpg','https://example.com/cuarta.jpg']);
assert.deepEqual(original.locations[0].gallery_urls,[]);
assert.equal(normalizeStorefront({locations:[{
  gallery_urls:['blob:https://example.com/temp']
}]}).locations[0].gallery_urls.length,0);
assert.deepEqual(normalizeStorefront({locations:[{
  gallery_urls:['blob:https://example.com/temp']
}]},true).locations[0].gallery_urls,['blob:https://example.com/temp']);
assert.equal(normalizeStorefront({locations:[{
  gallery_urls:Array(20).fill('https://example.com/photo.jpg')
}]}).locations[0].gallery_urls.length,6);
assert.ok(page.includes('id="location-photo-dialog"'));
assert.ok(page.includes('id="location-photo-full"'));
assert.ok(page.includes('id="location-photo-thumbs"'));
assert.ok(page.includes('id="location-photo-close"'));
assert.ok(page.includes('id="location-photo-prev"'));
assert.ok(page.includes('id="location-photo-next"'));
assert.ok(publicCode.includes('function openLocationViewer(location,photos,index=0)'));
assert.ok(publicCode.includes('function showLocationViewerPhoto(index)'));
assert.ok(publicCode.includes("locationViewer.showModal()"));
assert.ok(publicCode.includes("location.gallery_urls||[]"));
assert.ok(publicCode.includes("photos.slice(0,2)"));
assert.ok(publicCode.includes("'Ver fotos ('+photos.length+')'"));
assert.ok(publicCode.includes("event.key==='ArrowLeft'||event.key==='ArrowRight'"));
assert.ok(publicCode.includes("event.changedTouches[0].clientX"));
assert.ok(adminCode.includes('function appendExtraLocationPhoto(section,url='));
assert.ok(adminCode.includes('MAX_EXTRA_LOCATION_PHOTOS=6'));
assert.ok(adminCode.includes("requested.locations[i].gallery_urls=gallery"));
assert.ok(adminCode.includes("row.querySelector('[data-location-extra-file]')?.files[0]"));
assert.ok(style.includes('.location-photo-dialog::backdrop'));
assert.ok(style.includes('.official-photo-trigger'));


const bannerSettings=normalizeStorefront({
  banner_extra_slides:[
    {desktop_url:'https://example.com/pc-2.webp',mobile_url:'https://example.com/mobile-2.webp'},
    {desktop_url:'javascript:alert(1)',mobile_url:'http://example.com/insecure.webp'},
    {desktop_url:'https://example.com/pc-3.webp'}
  ]
});
assert.equal(bannerSettings.banner_autoplay,true);
assert.equal(bannerSettings.banner_interval_seconds,3);
assert.deepEqual(bannerSettings.banner_extra_slides,[
 {desktop_url:'https://example.com/pc-2.webp',mobile_url:'https://example.com/mobile-2.webp'},
 {desktop_url:'https://example.com/pc-3.webp',mobile_url:''}
]);
assert.equal(normalizeStorefront({banner_extra_slides:Array(10).fill({desktop_url:'https://example.com/a.webp'})}).banner_extra_slides.length,7);
assert.equal(normalizeStorefront({banner_extra_slides:[{desktop_url:'blob:https://example.com/p'}]},true).banner_extra_slides[0].desktop_url,
  'blob:https://example.com/p');
const areasConfigured=normalizeStorefront({quick_areas:[
 {id:'laboratorio',label:'Laboratorio dental',enabled:true,terms:['yeso']},
 {id:'endodoncia',label:'Endodoncia',enabled:false,terms:['lima']},
 {id:'personalizada-fresa',label:'Fresas',enabled:true,terms:[]},
 {id:'javascript:alert(1)',label:'Mala'}
]});
assert.deepEqual(areasConfigured.quick_areas.map(a=>a.label),['Laboratorio dental','Endodoncia','Fresas']);
assert.equal(areasConfigured.quick_areas[1].enabled,false);
const quickModule=await load('catalog-quick-search.js');
assert.deepEqual(quickModule.quickAreasForProduct({name:'Limas de endodoncia',area_id:'laboratorio'},areasConfigured.quick_areas),['laboratorio']);
assert.deepEqual(quickModule.quickAreasForProduct({name:'Limas de endodoncia',area_id:'endodoncia'},areasConfigured.quick_areas),[]);
assert.deepEqual(quickModule.quickAreasForProduct({name:'Fresa',area_id:'personalizada-fresa'},areasConfigured.quick_areas,false),['personalizada-fresa']);
assert.deepEqual(quickModule.quickAreasForProduct({name:'Limas endodónticas'},areasConfigured.quick_areas,false),[]);
assert.ok(page.includes('id="storefront-slider-controls"'));
assert.ok(page.includes('id="storefront-slide-prev"'));
assert.ok(page.includes('id="storefront-slide-next"'));
assert.ok(adminPage.includes('id="design-banner-slides"'));
assert.ok(adminPage.includes('id="design-areas-list"'));
assert.ok(adminPage.includes('id="design-auto-areas"'));
assert.ok(adminPage.includes('id="design-banner-autoplay"'));
assert.ok(read('admin.html').includes('id="product-area"'));
assert.ok(read('admin.js').includes("area_id:$('#product-area').value"));
assert.ok(backend.includes("area_id: /^[a-z0-9-]{1,55}$/.test"));
assert.ok(publicCode.includes("},bannerIntervalMs);"),'Carrusel usa intervalo de 3 segundos');
assert.ok(publicCode.includes("bannerIntervalMs=3000"),'El valor inicial es 3 segundos');
assert.ok(publicCode.includes("bannerStage.addEventListener('touchstart'"),'Permite deslizar banners en teléfono');
assert.ok(publicCode.includes("bannerStage.addEventListener('touchend'"),'Deslizamiento horizontal activo en teléfono');
assert.ok(publicCode.includes("bannerUserPaused"),'Es posible pausar el carrusel');
assert.ok(publicCode.includes("bannerPlayButton.setAttribute('aria-label'"),'Botón pausar accesible');
assert.ok(!publicCode.includes("bannerReducedMotion.matches||document.hidden"),
  'La preferencia Android de reducir animaciones no debe bloquear la rotación solicitada');
assert.ok(style.includes('height:clamp(245px,45dvh,350px)'), 'El banner móvil tiene altura moderada');
assert.ok(style.includes('flex:0 0 190px'), 'Tarjetas de marcas más grandes en móvil');
assert.ok(adminPage.includes('Cambiar automáticamente cada 3 segundos'),
  'La configuración explica la cadencia nueva');
assert.ok(publicCode.includes("currentQuickAreas=values.quick_areas"));
assert.ok(publicCode.includes("quickAreasForProduct(p,currentQuickAreas,currentQuickAuto)"));
assert.ok(adminCode.includes("requested.banner_extra_slides=uploadedExtras"));
assert.ok(adminCode.includes("quick_areas:readAreas()"));
assert.ok(style.includes('.storefront-slider-controls'));


// Marcas alineadas y presentación compacta verificables en escritorio y teléfono.
assert.ok(publicCode.includes("button.setAttribute('aria-pressed',String(brand.value===name))"),
  'La marca seleccionada debe identificarse para lectores de pantalla');
assert.ok(publicCode.includes("element('span',null,'brand-shortcut-label')"),
  'Las tarjetas deben distinguir nombre de marca y cantidad de productos');
assert.ok(publicCode.includes("if(hero.contains(copyBrand))$('.brands-heading').append(copyBrand)"),
  'Compartir marca debe conservarse al cambiar de filtro');
assert.ok(publicCode.includes("meta.append(reset,copyBrand)"),
  'Copiar enlace debe integrarse en la ficha y no dejar un botón suelto arriba');
assert.ok(publicCode.includes("window.prompt('Copia el enlace de esta marca:',url)"),
  'Los errores de portapapeles no deben imprimir una URL larga en la tarjeta');
assert.ok(style.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),
  'Teléfono debe mostrar dos columnas sin desplazamiento horizontal');
assert.ok(style.includes('/* POLADENT · marcas alineadas y legibles en teléfono y PC'),
  'Debe aplicar el ajuste final de presentación responsive');
assert.ok(style.includes('body.storefront-active.storefront-theme-premium-compacta #brand-hero .brand-hero-cover{\n  display:none;'),
  'La portada miniatura redundante no debe dejar grandes huecos en la ficha');
assert.ok(style.includes('body.storefront-active.storefront-theme-premium-compacta #brand-hero #copy-brand'),
  'El botón de copiar enlace debe tener estilo compacto');

console.log('Escaparate editable: vista previa, datos reales, protección y opciones móviles/PC correctos.');
