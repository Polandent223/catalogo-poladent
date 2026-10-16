export function whatsappInquiryURL(phone, product, productLink) {
  if (!/^[1-9][0-9]{7,14}$/.test(String(phone || ''))) return '';
  const greeting = product.status === 'sold_out'
    ? 'Hola, quisiera saber cuándo estará disponible este producto de POLADENT Casa Dental:'
    : 'Hola, quisiera consultar precio y disponibilidad de este producto de POLADENT Casa Dental:';
  const message = [
    greeting,
    'Producto: ' + String(product.name || ''),
    'Marca: ' + String(product.brand || ''),
    'Enlace: ' + String(productLink || '')
  ].join('\n');
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
}
