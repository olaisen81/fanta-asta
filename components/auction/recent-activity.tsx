'use client';

import React, { useState } from 'react';
import { History, Undo2, CheckCircle2, Trash2, Edit3, Check, X } from 'lucide-react';
import { PlayerRole } from '../../lib/supabase/types';
import { getRoleBadgeStyles } from '../../lib/fantacalcio/calculator';
import { useAuction } from '../../context/auction-context';

export function RecentActivity() {
  const {
    roster,
    teams,
    currentUser,
    undoLastAssignment,
    removePlayerFromRoster,
    updateRosterPrice,
  } = useAuction();

  const [isUndoing, setIsUndoing] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPriceVal, setEditPriceVal] = useState<number>(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleUndo = async () => {
    try {
      setIsUndoing(true);
      await undoLastAssignment();
      setConfirmUndo(false);
    } finally {
      setIsUndoing(false);
    }
  };

  const handleStartEdit = (item: any) => {
    setEditingItemId(item.id);
    setEditPriceVal(item.price);
    setActionError(null);
  };

  const handleSaveEditPrice = async (itemId: string) => {
    const res = await updateRosterPrice(itemId, editPriceVal);
    if (!res.success) {
      setActionError(res.error || 'Errore modifica prezzo.');
    } else {
      setEditingItemId(null);
      setActionError(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    await removePlayerFromRoster(itemId);
    setDeletingId(null);
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0e1628] p-4 sm:p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm sm:text-base font-bold text-white">
            Ultime Assegnazioni ({roster.length})
          </h3>
        </div>

        {/* Pulsante Undo rapido per l'Amministratore */}
        {currentUser.isAdmin && roster.length > 0 && (
          <div>
            {!confirmUndo ? (
              <button
                type="button"
                onClick={() => setConfirmUndo(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
                title="Annulla l'ultima assegnazione effettuata"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Annulla Ultimo</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 animate-in fade-in-50">
                <span className="text-[11px] text-rose-300 font-medium">Confermi?</span>
                <button
                  onClick={handleUndo}
                  disabled={isUndoing}
                  className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Sì
                </button>
                <button
                  onClick={() => setConfirmUndo(false)}
                  className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  No
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
          {actionError}
        </div>
      )}

      {roster.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          Nessun calciatore ancora assegnato alle rose.
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {roster.slice(0, 15).map((item) => {
            const team = teams.find((t) => t.id === item.team_id);
            const badge = getRoleBadgeStyles(item.role as PlayerRole);
            const isEditing = editingItemId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`h-6 w-6 rounded-md font-bold text-[11px] flex items-center justify-center shrink-0 border ${badge.bg} ${badge.text} ${badge.border}`}
                  >
                    {item.role}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white truncate">{item.player_name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                      <span>{item.serie_a_team}</span>
                      <span>➜</span>
                      <span className="text-indigo-300 font-semibold truncate">
                        {team?.name || 'Squadra'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prezzo & Azioni Admin */}
                <div className="shrink-0 flex items-center gap-2 ml-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        value={editPriceVal}
                        onChange={(e) => setEditPriceVal(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-14 px-1 py-0.5 text-center text-xs font-bold rounded bg-slate-950 text-amber-400 border border-indigo-500 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveEditPrice(item.id)}
                        className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                        title="Salva prezzo"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setEditingItemId(null)}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                        title="Annulla"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="font-black text-amber-400 text-sm">
                      {item.price} FM
                    </span>
                  )}

                  {currentUser.isAdmin && !isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Modifica crediti pagati"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>

                      {!isDeleting ? (
                        <button
                          type="button"
                          onClick={() => setDeletingId(item.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Rimuovi calciatore dalla rosa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 animate-in fade-in-50">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-600 hover:bg-rose-500 text-white"
                          >
                            Elimina
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-1 py-0.5 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-white"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
