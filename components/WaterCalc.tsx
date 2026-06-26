'use client';

import React, { useState, useMemo } from 'react';
import { Droplets, AlertCircle, TrendingUp } from 'lucide-react';
import { SavingResult } from '../lib/types';

export default function WaterCalc() {
  const [familyMembers, setFamilyMembers] = useState<number>(3);
  const [crateCost, setCrateCost] = useState<number>(2.50); // average cost for 6 bottles of 1.5L
  const [cookWithBottled, setCookWithBottled] = useState<boolean>(true);

  const results = useMemo<SavingResult>(() => {
    // Basic water consumed per person per day in Liters (drinking = 1.6L)
    let dailyLitersPerPerson = 1.6;
    if (cookWithBottled) {
      dailyLitersPerPerson += 1.2; // cooking pasta, soups, washing veggies etc
    }

    const totalDailyLiters = dailyLitersPerPerson * familyMembers;
    const annualLiters = totalDailyLiters * 365;

    // Convert to 1.5L bottles
    const bottlesPerYear = Math.round(annualLiters / 1.5);

    // Cost of 1 bottle of 1.5L
    const singleBottleCost = crateCost / 6;
    const totalSpendPerYear = Math.round(bottlesPerYear * singleBottleCost);

    // Environmental metrics
    const plasticWeightSavedKg = Math.round((bottlesPerYear * 40) / 1000); // 40g per PET bottle
    const co2SavedKg = Math.round(bottlesPerYear * 0.18); // average 180g of CO2 per pet bottle lifecycle

    return {
      bottlesSaved: bottlesPerYear,
      moneySaved: totalSpendPerYear,
      plasticKgSaved: plasticWeightSavedKg,
      co2Saved: co2SavedKg
    };
  }, [familyMembers, crateCost, cookWithBottled]);

  return (
    <div className="bg-slate-950 text-white rounded-xl p-6 md:p-8 shadow-sm border border-slate-800" id="savings-calculator">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-blue-600 text-white p-2.5 rounded-lg">
          <TrendingUp size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white leading-none">
            Calcola il Tuo Risparmio
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Scopri quanto spendi in acqua minerale a Firenze e l'impatto ecologico delle bottiglie.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Controls block */}
        <div className="space-y-5">
          {/* Slider for family members */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Numero Componenti Famiglia</span>
              <span className="text-blue-400 font-mono text-sm">{familyMembers} {familyMembers === 1 ? 'Persona' : 'Persone'}</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              value={familyMembers}
              onChange={(e) => setFamilyMembers(parseInt(e.target.value))}
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono tracking-wider">
              <span>1 Persona</span>
              <span>4 Persone</span>
              <span>8 Persone</span>
            </div>
          </div>

          {/* Slider for crate cost */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Costo medio cassa d'acqua (6 x 1.5L)</span>
              <span className="text-blue-400 font-mono text-sm">{crateCost.toFixed(2)} €</span>
            </div>
            <input
              type="range"
              min="1.00"
              max="5.00"
              step="0.10"
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              value={crateCost}
              onChange={(e) => setCrateCost(parseFloat(e.target.value))}
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono tracking-wider">
              <span>1.00 € (Economica)</span>
              <span>2.50 € (Media)</span>
              <span>5.00 € (Premium/Vetro)</span>
            </div>
          </div>

          {/* Cooking Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-200 block">Usi l'acqua minerale per cucinare?</span>
              <span className="text-[11px] text-slate-500 block">Pasta, tè, caffè, brodi, lavaggio frutta.</span>
            </div>
            <button
              onClick={() => setCookWithBottled(!cookWithBottled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                cookWithBottled ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  cookWithBottled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Results display box */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 text-blue-500/5 pointer-events-none">
            <Droplets size={120} />
          </div>

          <div className="relative z-10 space-y-6">
            {/* Money Saved Highlight */}
            <div className="text-center pb-5 border-b border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Risparmio Annuo Stimato
              </span>
              <span className="text-4xl md:text-5xl font-bold text-blue-400 font-mono">
                ~ {results.moneySaved} €
              </span>
              <span className="text-[11px] text-slate-400 block mt-1.5">
                pari al costo di acquisto di ben <strong className="text-white">{Math.round(results.moneySaved / (crateCost/6))}</strong> bottiglie.
              </span>
            </div>

            {/* Environmental stats rows */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xl md:text-2xl font-bold text-blue-400 block font-mono">{results.bottlesSaved}</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block mt-1">Bottiglie</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xl md:text-2xl font-bold text-emerald-400 block font-mono">{results.plasticKgSaved} kg</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block mt-1">Plastica</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xl md:text-2xl font-bold text-teal-400 block font-mono">{results.co2Saved} kg</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider block mt-1">CO₂</span>
              </div>
            </div>

            {/* Micro warning indicator */}
            <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-950/50 p-3 rounded-lg">
              <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <span>
                Immagina la comodità e lo sforzo evitato: non dovrai trasportare{' '}
                <strong className="text-white">{Math.round((results.bottlesSaved * 1.5))} kg</strong> d'acqua ogni anno per le scale di casa tua a Firenze!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
