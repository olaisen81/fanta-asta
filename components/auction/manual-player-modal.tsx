'use client';

import React, { useState } from 'react';
import { X, Plus, UserPlus } from 'lucide-react';
import { PlayerRole, Player } from '../../lib/supabase/types';
import { getRoleBadgeStyles } from '../../lib/fantacalcio/calculator';
import { useAuction } from '../../context/auction-context';

interface ManualPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerCreated: (player: Player) => void;
}

export function ManualPlayerModal({
  isOpen,
  onClose,
  onPlayerCreated,
}: ManualPlayerModalProps) {
  const { addManualPlayer } = useAuction();
  const [name, setName] = useState('');
  const [role, setRole] = useState<PlayerRole>('C');
  const [team, setTeam] = useState('');
  const [price, setPrice] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Inserisci il nome del calciatore.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await addManualPlayer(
        name.trim(),
        role,
        team.trim() || 'Serie A',
        price || 1
      );
      setName('');
      setTeam('');
      setPrice(1);
      onPlayerCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Errore durante la creazione.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0f172a] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Aggiungi Calciatore Manuale</h3>
              <p className="text-xs text-slate-400">
                Se il calciatore non è nel listone o è un nuovo acquisto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome Calciatore */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome e Cognome *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Nico Paz, Kenan Yildiz..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Selezione Ruolo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ruolo Fantacalcio *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['P', 'D', 'C', 'A'] as const).map((r) => {
                const isSelected = role === r;
                const badge = getRoleBadgeStyles(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-1 rounded-xl text-center font-bold text-xs border transition-all ${
                      isSelected
                        ? `${badge.bg} ${badge.text} ${badge.border} ring-2 ring-indigo-500/50 shadow-md`
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-sm">{r}</div>
                    <div className="text-[10px] font-normal">{badge.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Squadra Serie A & Prezzo Base */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Squadra Club
              </label>
              <input
                type="text"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="es. Juventus, Inter..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quotazione Base (FM)
              </label>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>{isSubmitting ? 'Salvataggio...' : 'Crea e Seleziona'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
