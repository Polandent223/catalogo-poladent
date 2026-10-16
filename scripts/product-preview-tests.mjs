import assert from 'node:assert/strict';
import {productPage,ogImage} from './generate-product-share.mjs';

const p={id:'ITEM_123',name:'Set de inyectores endodónticos',brand:'ADALTA',status:'available',
  image_url:'https://res.cloudinary.com/pewsdgm5/image/upload/v123/poladent-catalogo/item.webp',
  description:'Un set de prueba con pinzas, diseño <premium> & detalles'};
const html=productPage(p);
assert.match(html,/<meta property="og:title" content="Set de inyectores endodónticos \| ADALTA \| POLADENT Casa Dental">/);
assert.match(html,/<meta property="og:image" content="https:\/\/res\.cloudinary\.com\/pewsdgm5\/image\/upload\/f_jpg,c_pad,w_1200,h_630,b_white\/v123\/poladent-catalogo\/item\.webp">/);
assert.match(html,/diseño &lt;premium&gt; &amp; detalles/);
assert.match(html,/share\/ITEM_123\//);
assert.match(html,/marca=ADALTA#producto=ITEM_123/);
assert.ok(!html.includes('diseño <premium>'));
assert.ok(!html.includes('idToken'));
assert.equal(ogImage('javascript:alert(1)'),'');
assert.equal(ogImage('http://example.com/a.png'),'');
assert.equal(ogImage('https://example.com/hello.png'),'https://example.com/hello.png');
const hostile=productPage({...p,name:'X " /> <script>alert(1)</script>',description:'<img src=x onerror=bad()>'});
assert.ok(hostile.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert.ok(!hostile.includes('<script>alert(1)</script>'));
console.log('Pruebas OG de producto correctas');
