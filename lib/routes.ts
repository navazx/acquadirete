import { PageId } from './types';

// Mappa centrale fra l'identificativo logico di una pagina e il suo URL reale.
// È l'unico punto da modificare se un URL deve cambiare.
export const ROUTES: Record<PageId, string> = {
  home: '/',
  depuratore: '/depuratore-acqua-firenze',
  prato: '/depuratore-acqua-prato',
  pistoia: '/depuratore-acqua-pistoia',
  osmosi: '/osmosi-inversa-firenze',
  business: '/depuratore-acqua-uffici-firenze',
  assistenza: '/assistenza-depuratore-firenze',
  carboni: '/depuratore-carboni-attivi-firenze',
  frizzante: '/acqua-frizzante-firenze',
  recensioni: '/recensioni',
  contatti: '/contatti',
};

// Etichetta breve usata nel breadcrumb delle pagine servizio.
export const PAGE_BREADCRUMB: Record<PageId, string> = {
  home: 'Home',
  depuratore: 'Depuratore Acqua Firenze',
  prato: 'Depuratore Acqua Prato',
  pistoia: 'Depuratore Acqua Pistoia',
  osmosi: 'Osmosi Inversa',
  business: 'Uffici e Ristoranti',
  assistenza: 'Assistenza',
  carboni: 'Carboni Attivi',
  frizzante: 'Acqua Frizzante',
  recensioni: 'Recensioni',
  contatti: 'Contatti',
};
