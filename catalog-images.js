// Cloudinary sirve fotos más pequeñas para las tarjetas sin alterar el original.
export function cloudinaryImage(url, width=720) {
  try {
    const image=new URL(url);
    if(image.protocol!=='https:'||image.hostname!=='res.cloudinary.com'
      || !image.pathname.includes('/image/upload/'))return url;
    const size=Math.max(240,Math.min(1440,Math.round(width)));
    image.pathname=image.pathname.replace('/image/upload/','/image/upload/f_auto,q_auto,c_limit,w_'+size+'/');
    return image.href;
  } catch {return url;}
}
export function setCardImage(img,url,index=0) {
  const original=String(url || '');
  const optimized=cloudinaryImage(original,720);
  img.src=optimized;
  if(optimized!==original) {
    img.srcset=cloudinaryImage(original,360)+' 360w, '+optimized+' 720w';
    img.sizes='(max-width: 800px) 48vw, (max-width: 1150px) 32vw, 350px';
  }
  img.loading=index<3?'eager':'lazy';
  img.decoding='async';
  img.width=720;
  img.height=720;
  if(index===0) img.fetchPriority='high';
}
