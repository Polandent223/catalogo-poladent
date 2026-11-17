/**
 * POLADENT | Firma segura para Cloudinary
 * Ejecutar como Cloudflare Worker (no en GitHub Pages).
 * Variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY.
 * Secreto: CLOUDINARY_API_SECRET (solo en Cloudflare, jamás en GitHub).
 * Ninguna clave privada se entrega al navegador.
 */
const FIREBASE_PROJECT = 'catalogo-poladent';
const ALLOWED_ORIGINS = new Set(['https://polandent223.github.io',
  'https://catalogopoladent.com','https://www.catalogopoladent.com']);
const MEDIA_FOLDER = 'poladent-catalogo';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

function respond(data, status = 200, origin = '') {
  const headers={
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'Vary':'Origin'
  };
  if(ALLOWED_ORIGINS.has(origin))headers['Access-Control-Allow-Origin']=origin;
  return new Response(JSON.stringify(data),{status,headers});
}
function bytes64url(value) {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')), c => c.charCodeAt(0));
}
function parse64(value) {
  return JSON.parse(new TextDecoder().decode(bytes64url(value)));
}
async function verifyToken(jwt) {
  if (!jwt || jwt.length > 7000) throw Error('missing-token');
  const parts = jwt.split('.');
  if (parts.length !== 3) throw Error('invalid-token');
  const header = parse64(parts[0]);
  const claims = parse64(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string'
    || claims.aud !== FIREBASE_PROJECT
    || claims.iss !== 'https://securetoken.google.com/' + FIREBASE_PROJECT
    || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128
    || !Number.isFinite(claims.exp) || claims.exp <= now
    || !Number.isFinite(claims.iat) || claims.iat > now
    || !Number.isFinite(claims.auth_time) || claims.auth_time > now
    || claims.iat < claims.auth_time) throw Error('invalid-claims');
  const keysRes = await fetch(GOOGLE_JWKS_URL, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!keysRes.ok) throw Error('google-key-unavailable');
  const jwks = await keysRes.json();
  const jwk = (jwks.keys || []).find(k => k.kid === header.kid && k.kty === 'RSA' && (k.alg === 'RS256' || !k.alg));
  if (!jwk) throw Error('unrecognized-key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes64url(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!verified) throw Error('invalid-signature');

  // Usa las MISMAS reglas publicadas en Firestore. El usuario debe seguir
  // autorizado como catalogAdmins/<UID> con active=true.
  const id = encodeURIComponent(claims.sub);
  const url = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT + '/databases/(default)/documents/catalogAdmins/' + id;
  const result = await fetch(url, { headers: { Authorization: 'Bearer ' + jwt }, cache: 'no-store' });
  if (!result.ok) throw Error('admin-not-authorized');
  const doc = await result.json();
  if (doc.fields?.active?.booleanValue !== true) throw Error('admin-not-authorized');
  return claims.sub;
}
async function sign(fields, secret) {
  const params = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + '=' + v).join('&');
  const bytes = new TextEncoder().encode(params + secret);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin')||'';
    const reply=(data,status=200)=>respond(data,status,origin);
    if (!ALLOWED_ORIGINS.has(origin)) return reply({ error: 'Origen no autorizado' }, 403);
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Max-Age': '600',
          'Vary': 'Origin'
        }
      });
    }
    if (request.method !== 'POST') return reply({ error: 'Método no permitido' }, 405);
    const route = new URL(request.url).pathname;
    if (!['/sign', '/delete'].includes(route)) return reply({ error: 'Ruta inexistente' }, 404);
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      return reply({ error: 'Falta configurar Cloudinary en Cloudflare' }, 503);
    }
    const bearer = request.headers.get('Authorization') || '';
    if (!bearer.startsWith('Bearer ')) return reply({ error: 'Inicia sesión' }, 401);
    try { await verifyToken(bearer.slice(7)); }
    catch { return reply({ error: 'Cuenta no autorizada o sesión vencida' }, 403); }

    const timestamp = String(Math.floor(Date.now() / 1000));
    if (route === '/sign') {
      const params = {
        overwrite: 'false',
        public_id: MEDIA_FOLDER + '/' + crypto.randomUUID(),
        timestamp
      };
      const signature = await sign(params, env.CLOUDINARY_API_SECRET);
      return reply({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        ...params,
        signature
      });
    }
    let body;
    try { body = await request.json(); } catch { return reply({ error: 'Solicitud inválida' }, 400); }
    const publicId = body?.public_id;
    if (typeof publicId !== 'string' ||
        !/^poladent-catalogo\/[a-f0-9-]{36}$/.test(publicId)) {
      return reply({ error: 'Archivo fuera del catálogo' }, 400);
    }
    const params = { public_id: publicId, timestamp };
    const signature = await sign(params, env.CLOUDINARY_API_SECRET);
    const form = new FormData();
    for (const [k, v] of Object.entries({ ...params, signature, api_key: env.CLOUDINARY_API_KEY })) form.append(k, v);
    const response = await fetch('https://api.cloudinary.com/v1_1/' + encodeURIComponent(env.CLOUDINARY_CLOUD_NAME) + '/image/destroy', {
      method: 'POST', body: form
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !['ok', 'not found'].includes(result.result)) {
      return reply({ error: 'No se pudo eliminar la imagen del alojamiento' }, 502);
    }
    return reply({ removed: true });
  }
};
