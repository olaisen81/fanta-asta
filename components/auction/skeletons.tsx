import React from 'react';

/**
 * Componente Skeleton base con animazione pulsante e stile scuro armonizzato
 */
export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-slate-800/70 border border-slate-700/20 ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton per la Dashboard Principale (Home / Assegna Rose)
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Banner Superiore */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>

      {/* Grid Principale: Sinistra Assegnazione/Squadre, Destra Recenti */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Colonna Sinistra */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {/* Quick Assign Card Skeleton */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
              </div>
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>

            {/* Ricerca Calciatore Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-12 w-full rounded-2xl" />
            </div>

            {/* Squadre Grid Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            </div>

            {/* Prezzo & Assegna CTA Skeleton */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Skeleton className="h-12 w-40 rounded-2xl" />
              <Skeleton className="h-12 flex-1 rounded-2xl" />
            </div>
          </div>

          {/* Budget Overview Skeleton (10 Squadre) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="h-9 w-9 rounded-xl" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-xl" />
                  </div>

                  <Skeleton className="h-2 w-full rounded-full" />

                  <div className="flex items-center justify-between gap-1 pt-1">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="h-6 flex-1 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonna Destra: Recent Activity */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-5">
          <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-lg" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            <div className="space-y-2.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-12 rounded-xl" />
                    <Skeleton className="h-6 w-6 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton per la pagina Rose (10 Squadre)
 */
export function RoseSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Pillole Filtro Squadre */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Skeleton className="h-8 w-28 rounded-xl shrink-0" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-xl shrink-0" />
        ))}
      </div>

      {/* Schede Rose (2 visualizzate come placeholder) */}
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl bg-slate-900/60 border border-slate-800 p-5 sm:p-6 space-y-4 shadow-xl"
          >
            {/* Header Squadra */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>

              {/* Badge Crediti */}
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-7 w-28 rounded-xl" />
                <Skeleton className="h-7 w-28 rounded-xl" />
                <Skeleton className="h-7 w-28 rounded-xl" />
              </div>
            </div>

            {/* Tabella Calciatori Skeleton */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 text-xs text-slate-500 font-semibold border-b border-slate-800/60">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>

              {Array.from({ length: 6 }).map((_, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-lg" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-3.5 w-24 hidden sm:block" />
                  <Skeleton className="h-5 w-12 rounded-lg font-mono" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-7 w-7 rounded-xl" />
                    <Skeleton className="h-7 w-7 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton per la pagina Listone Calciatori
 */
export function ListoneSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header & Statistiche */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* Metric Cards Contatori */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Barra Ricerca & Filtri */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-12 rounded-lg" />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Tabella Calciatori Skeleton */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-8 w-8 rounded-xl shrink-0" />
              <div className="space-y-1 flex-1 max-w-xs">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-24 hidden md:block" />
            <Skeleton className="h-6 w-14 rounded-lg" />
            <Skeleton className="h-6 w-14 rounded-lg hidden sm:block" />
            <Skeleton className="h-7 w-24 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton per la pagina Storico Rose & Aste
 */
export function StoricoSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3.5 w-72" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Barra Selezione Stagioni */}
      <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-xl shrink-0" />
          ))}
        </div>
        <Skeleton className="h-8 w-44 rounded-xl shrink-0" />
      </div>

      {/* Schede Statistiche Stagione */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>

      {/* Scheda Rosa Storica Skeleton */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-7 w-28 rounded-xl" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-6 w-6 rounded-lg" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-12 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton per la pagina Amministrazione Squadre & Stagioni
 */
export function AdminSquadreSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>

      {/* Sezione Gestione Stagioni Skeleton */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <Skeleton className="h-9 w-48 rounded-xl" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-xl shrink-0" />
          ))}
        </div>
      </div>

      {/* Sezione Regolamento & Budget Skeleton */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-6 w-36 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* 10 Squadre Grid Skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-44" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-9 w-9 rounded-xl" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
