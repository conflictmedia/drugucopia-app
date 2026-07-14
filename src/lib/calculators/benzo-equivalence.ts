export interface BenzoEquivalence {
  name: string;
  genericName: string;
  halfLifeHours: { min: number; max: number };
  equivalenceMg: number; // mg equivalent to 10mg diazepam
  potencyRatio: number; // relative to diazepam (diazepam = 1)
  onset: 'rapid' | 'intermediate' | 'slow';
  notes?: string;
}

export const BENZODIAZEPINES: BenzoEquivalence[] = [
  { name: 'Diazepam (Valium)', genericName: 'diazepam', halfLifeHours: { min: 20, max: 100 }, equivalenceMg: 10, potencyRatio: 1, onset: 'rapid', notes: 'Reference standard. Long half-life, active metabolites.' },
  { name: 'Clonazepam (Klonopin)', genericName: 'clonazepam', halfLifeHours: { min: 18, max: 50 }, equivalenceMg: 0.5, potencyRatio: 20, onset: 'intermediate', notes: 'High potency. Long half-life.' },
  { name: 'Alprazolam (Xanax)', genericName: 'alprazolam', halfLifeHours: { min: 6, max: 27 }, equivalenceMg: 0.5, potencyRatio: 20, onset: 'rapid', notes: 'Short half-life. Higher dependence risk.' },
  { name: 'Lorazepam (Ativan)', genericName: 'lorazepam', halfLifeHours: { min: 10, max: 20 }, equivalenceMg: 1, potencyRatio: 10, onset: 'intermediate', notes: 'No active metabolites. Preferred in liver disease.' },
  { name: 'Temazepam (Restoril)', genericName: 'temazepam', halfLifeHours: { min: 8, max: 22 }, equivalenceMg: 10, potencyRatio: 1, onset: 'intermediate', notes: 'Primarily hypnotic. Shorter half-life.' },
  { name: 'Oxazepam (Serax)', genericName: 'oxazepam', halfLifeHours: { min: 4, max: 15 }, equivalenceMg: 10, potencyRatio: 1, onset: 'slow', notes: 'Direct glucuronidation. Safe in liver disease.' },
  { name: 'Chlordiazepoxide (Librium)', genericName: 'chlordiazepoxide', halfLifeHours: { min: 5, max: 30 }, equivalenceMg: 25, potencyRatio: 0.4, onset: 'slow', notes: 'Long-acting prodrug. Used for alcohol withdrawal.' },
  { name: 'Clorazepate (Tranxene)', genericName: 'clorazepate', halfLifeHours: { min: 30, max: 100 }, equivalenceMg: 10, potencyRatio: 1, onset: 'slow', notes: 'Prodrug to desmethyldiazepam. Very long half-life.' },
  { name: 'Flurazepam (Dalmane)', genericName: 'flurazepam', halfLifeHours: { min: 40, max: 250 }, equivalenceMg: 15, potencyRatio: 0.67, onset: 'rapid', notes: 'Active metabolite with very long half-life. Hypnotic.' },
  { name: 'Triazolam (Halcion)', genericName: 'triazolam', halfLifeHours: { min: 1.5, max: 5.5 }, equivalenceMg: 0.25, potencyRatio: 40, onset: 'rapid', notes: 'Ultra-short acting. High amnesia risk. Not for chronic use.' },
  { name: 'Midazolam (Versed)', genericName: 'midazolam', halfLifeHours: { min: 1.5, max: 3.5 }, equivalenceMg: 5, potencyRatio: 2, onset: 'rapid', notes: 'IV/IM use primarily. Very short acting.' },
  { name: 'Bromazepam (Lexotan)', genericName: 'bromazepam', halfLifeHours: { min: 10, max: 20 }, equivalenceMg: 3, potencyRatio: 3.33, onset: 'intermediate', notes: 'Intermediate potency.' },
  { name: 'Clobazam (Onfi)', genericName: 'clobazam', halfLifeHours: { min: 12, max: 60 }, equivalenceMg: 20, potencyRatio: 0.5, onset: 'intermediate', notes: 'Adjunct for epilepsy. Active metabolite N-desmethylclobazam.' },
  { name: 'Nordazepam (Nordaz)', genericName: 'nordazepam', halfLifeHours: { min: 30, max: 200 }, equivalenceMg: 10, potencyRatio: 1, onset: 'slow', notes: 'Active metabolite of diazepam/chlordiazepoxide. Very long half-life.' },
  { name: 'Prazepam (Centrax)', genericName: 'prazepam', halfLifeHours: { min: 30, max: 200 }, equivalenceMg: 10, potencyRatio: 1, onset: 'slow', notes: 'Prodrug to nordazepam. Very long half-life.' },
];

export function convertDose(
  fromBenzo: string,
  fromDoseMg: number,
  toBenzo: string
): { equivalentDose: number; fromEquiv: number; toEquiv: number } | null {
  const from = BENZODIAZEPINES.find(b => b.genericName === fromBenzo || b.name.toLowerCase().includes(fromBenzo.toLowerCase()));
  const to = BENZODIAZEPINES.find(b => b.genericName === toBenzo || b.name.toLowerCase().includes(toBenzo.toLowerCase()));
  
  if (!from || !to) return null;
  
  const diazepamEquiv = (fromDoseMg / from.equivalenceMg) * 10;
  const equivalentDose = (diazepamEquiv / 10) * to.equivalenceMg;
  
  return {
    equivalentDose: Math.round(equivalentDose * 100) / 100,
    fromEquiv: from.equivalenceMg,
    toEquiv: to.equivalenceMg,
  };
}

export function getDiazepamEquivalent(benzoName: string, doseMg: number): number {
  const benzo = BENZODIAZEPINES.find(b => b.genericName === benzoName || b.name.toLowerCase().includes(benzoName.toLowerCase()));
  if (!benzo) return 0;
  return (doseMg / benzo.equivalenceMg) * 10;
}

export function getBenzoInfo(name: string): BenzoEquivalence | undefined {
  return BENZODIAZEPINES.find(b => 
    b.genericName === name.toLowerCase() || 
    b.name.toLowerCase().includes(name.toLowerCase()) ||
    b.genericName.includes(name.toLowerCase())
  );
}

export function searchBenzos(query: string): BenzoEquivalence[] {
  const lower = query.toLowerCase();
  return BENZODIAZEPINES.filter(b => 
    b.name.toLowerCase().includes(lower) || 
    b.genericName.includes(lower)
  );
}