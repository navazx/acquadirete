'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  /** Titolo e sommario della sezione (di solito un h2 + un p). */
  header: ReactNode;
  /** Le card. Larghezza a carico loro; snap e "non restringerti" li mette il nastro. */
  children: ReactNode;
  /** Etichette per i lettori di schermo, es. "Recensioni". */
  label: string;
};

/**
 * Nastro di card che scorre in orizzontale invece di impilarsi: tiene corta la
 * pagina e ne mostra più di quante ne entrerebbero in una griglia.
 *
 * Tre modi per scorrerlo:
 *  - dito, sul touch: è un normale contenitore con overflow-x, quindi lo
 *    gestisce il browser (inerzia inclusa). Gli handler qui sotto escono
 *    subito sul pointerType "touch" per non intralciarlo, e touch-action
 *    resta "auto" così una passata verticale scorre comunque la pagina.
 *  - mouse: prendi e trascina (da desktop non esisterebbe).
 *  - frecce: compaiono solo se c'è davvero qualcosa da scorrere.
 */
export default function CardCarousel({ header, children, label }: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Se le card ci stanno tutte le frecce non servono: la soglia di 4px evita
  // che arrotondamenti sub-pixel le facciano comparire per niente.
  const syncArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrev(track.scrollLeft > 4);
    setCanNext(track.scrollLeft < track.scrollWidth - track.clientWidth - 4);
  }, []);

  // Due sentinelle invece di una: il ResizeObserver coglie anche i cambi di
  // larghezza che non passano dalla finestra (font che finisce di caricare,
  // barra laterale del browser), l'evento resize copre il caso in cui
  // l'osservatore non venga servito. Chiamare syncArrows di più non costa:
  // se i valori non cambiano React non ridisegna.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    syncArrows();
    const observer = new ResizeObserver(syncArrows);
    observer.observe(track);
    window.addEventListener('resize', syncArrows);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncArrows);
    };
  }, [syncArrows]);

  // Scorre di poco meno di una schermata, così la card di bordo resta visibile
  // e si capisce che il nastro continua.
  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  // Trascinamento col mouse. Durante il trascinamento si spengono snap e
  // scroll fluido, altrimenti il nastro non segue il puntatore; alla fine si
  // riaccendono e la card si aggancia da sé.
  const drag = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const track = trackRef.current;
    if (!track) return;
    justDragged.current = false;
    drag.current = { startX: e.clientX, startScroll: track.scrollLeft, moved: false };
    track.style.scrollBehavior = 'auto';
    track.style.scrollSnapType = 'none';
  };

  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const state = drag.current;
    if (!track || !state) return;
    const dx = e.clientX - state.startX;
    if (!state.moved) {
      if (Math.abs(dx) < 4) return; // clic fermo: lascia stare la selezione del testo
      state.moved = true;
      track.style.userSelect = 'none';
      track.setPointerCapture(e.pointerId);
    }
    track.scrollLeft = state.startScroll - dx;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    const state = drag.current;
    if (!track || !state) return;
    drag.current = null;
    track.style.scrollBehavior = '';
    track.style.scrollSnapType = '';
    track.style.userSelect = '';
    if (state.moved && track.hasPointerCapture(e.pointerId)) {
      track.releasePointerCapture(e.pointerId);
    }
    justDragged.current = state.moved;
  };

  // Dopo un trascinamento il browser manda comunque un click sull'elemento
  // sotto il puntatore: senza questo, trascinare una card servizio aprirebbe
  // la sua pagina. Il click fermo (senza spostamento) passa liscio.
  const swallowClickAfterDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!justDragged.current) return;
    justDragged.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const arrowClass =
    'w-10 h-10 rounded-full border border-slate-250 bg-white text-slate-700 flex items-center justify-center transition-colors cursor-pointer hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-white disabled:hover:text-slate-700 disabled:hover:border-slate-250';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="max-w-2xl space-y-3 text-center sm:text-left">{header}</div>

        {(canPrev || canNext) && (
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={!canPrev}
              aria-label={`${label}: indietro`}
              className={arrowClass}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={!canNext}
              aria-label={`${label}: avanti`}
              className={arrowClass}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* tabIndex sul nastro: chi naviga da tastiera ci arriva col Tab e lo
          scorre con le frecce. I browser recenti lo fanno da soli sui
          contenitori che scorrono, i più vecchi no. */}
      <div
        ref={trackRef}
        tabIndex={0}
        role="group"
        aria-label={label}
        onScroll={syncArrows}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={swallowClickAfterDrag}
        className="no-scrollbar flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:cursor-grab md:active:cursor-grabbing [&>*]:snap-start [&>*]:shrink-0"
      >
        {children}
      </div>
    </div>
  );
}
