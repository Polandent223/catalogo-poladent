// Enlaces a marcas y productos deben abrir la ficha directamente, sin pantalla de bienvenida.
export function shouldSkipWelcome(address) {
  const url=new URL(address,'https://catalogopoladent.com/');
  return url.searchParams.has('marca')
    || url.searchParams.has('catalogo')
    || new URLSearchParams(url.hash.slice(1)).has('producto')
    || url.hash==='#catalogo';
}
export function catalogEnteredURL(address) {
  const url=new URL(address,'https://catalogopoladent.com/');
  url.searchParams.set('catalogo','1');
  url.hash='';
  return url.href;
}
