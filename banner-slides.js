// Decide la fotografía visible según la pantalla. No altera los archivos originales.
export function bannerImageForViewport(slide, isMobile) {
  if (!slide) return '';
  return (isMobile ? slide.mobile_url || slide.desktop_url : slide.desktop_url || slide.mobile_url) || '';
}
