'use client';

import { useState } from 'react';
import { Star, Filter, ShieldCheck, User, ExternalLink, PenLine } from 'lucide-react';
import { Review } from '../lib/types';
import { REVIEWS, REVIEW_RATING, REVIEW_TOTAL, REVIEWS_ARE_LIVE } from '../lib/reviews';
import { GOOGLE_PROFILE_URL, GOOGLE_WRITE_REVIEW_URL } from '../lib/siteConfig';

export default function ReviewList() {
  const [reviews] = useState<Review[]>(REVIEWS);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'domestico' | 'business' | 'assistenza'>('all');

  const filteredReviews = selectedFilter === 'all'
    ? reviews
    : reviews.filter(r => r.category === selectedFilter);

  return (
    <div className="space-y-8" id="reviews-module">

      {/* Trust Header with Google statistics */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Main Stat */}
          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-1">
              <span className="text-5xl font-black text-slate-900 font-mono">{REVIEW_RATING.toFixed(1)}</span>
              <span className="text-xl font-bold text-slate-400 mt-2">/5</span>
            </div>
            <div className="flex text-amber-500 justify-center md:justify-start">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-[10px] text-slate-500 font-bold font-mono uppercase tracking-widest">
              Media recensioni Google
            </p>
          </div>

          {/* Social Proof Text */}
          <div className="text-center space-y-1.5 md:border-x md:border-slate-200 px-4">
            <span className="text-3xl font-black text-blue-600 block font-mono">{REVIEW_TOTAL}+</span>
            <span className="text-xs font-bold text-slate-900 block uppercase tracking-wider">Valutazioni Certificate</span>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Il 100% degli utenti a Firenze ha votato Acquadirete con il massimo punteggio per serietà ed efficienza dei nostri depuratori d'acqua.
            </p>
          </div>

          {/* Call to action */}
          <div className="flex flex-col items-center md:items-end justify-center">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-white px-3.5 py-1.5 rounded-md border border-slate-200 font-bold uppercase tracking-wider mb-4">
              <ShieldCheck size={14} className="text-emerald-600" />
              <span>Verificate al 100%</span>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto items-stretch">
              <a
                href={GOOGLE_PROFILE_URL}
                target="_blank"
                rel="noreferrer"
                title="Leggi tutte le recensioni su Google"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest px-5 py-3.5 rounded-lg shadow-sm cursor-pointer transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span>Leggi tutte le recensioni su Google</span>
                <ExternalLink size={14} />
              </a>
              <a
                href={GOOGLE_WRITE_REVIEW_URL}
                target="_blank"
                rel="noreferrer"
                title="Lascia la tua recensione su Google"
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs uppercase tracking-widest px-5 py-3 rounded-lg cursor-pointer transition-all duration-300 flex items-center justify-center gap-2"
              >
                <PenLine size={15} />
                <span>Lascia la tua Recensione</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs — nascosti per le recensioni Google (prive di categoria) */}
      {!REVIEWS_ARE_LIVE && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mr-2 flex items-center gap-1.5">
            <Filter size={13} /> FILTRA RECENSIONI:
          </span>
          {[
            { id: 'all', label: `TUTTI (${REVIEW_TOTAL}+)` },
            { id: 'domestico', label: 'USO DOMESTICO' },
            { id: 'business', label: 'UFFICI & LOCALI' },
            { id: 'assistenza', label: 'ASSISTENZA' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id as 'all' | 'domestico' | 'business' | 'assistenza')}
              className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                selectedFilter === filter.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid of Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="reviews-grid">
        {filteredReviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-250 flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Rating stars & verified badge */}
              <div className="flex justify-between items-center">
                <div className="flex text-amber-400">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[9px] bg-slate-50 text-slate-500 px-2.5 py-0.5 rounded-md border border-slate-200 font-mono font-bold uppercase tracking-wider">
                  Cliente Verificato
                </span>
              </div>

              {/* Review Text */}
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "{review.text}"
              </p>
            </div>

            {/* Author Meta Details */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-100 text-slate-600 font-bold text-sm rounded-lg flex items-center justify-center shrink-0 uppercase border border-slate-200">
                <User size={14} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900 leading-none">{review.author}</p>
                <p className="text-slate-400 text-[9px] mt-1 uppercase tracking-wider font-semibold">
                  {[review.role, review.location, review.date].filter(Boolean).join(' • ')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
