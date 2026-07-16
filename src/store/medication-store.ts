import { create } from 'zustand';
import * as substancesIndex from '@/lib/substances/index';
import { checkInteractions } from '@/lib/interaction-checker';
import type { Substance } from '@/lib/substances/types';

/**
 * Defensive resolver: prefer `getSubstanceByIdAll` (which includes the
 * medications category) when the substances submodule exposes it; fall
 * back to `getSubstanceById` for older submodule versions that don't
 * ship the medications category yet. Either way the function signature
 * is `(id: string) => Substance | undefined`.
 */
const getSubstanceByIdAll: (id: string) => Substance | undefined =
  (substancesIndex as any).getSubstanceByIdAll ?? substancesIndex.getSubstanceById;

export type MedicationType = 
  | 'SSRI' 
  | 'SNRI' 
  | 'MAOI' 
  | 'TCA' 
  | 'Benzodiazepine' 
  | 'Antipsychotic' 
  | 'Mood Stabilizer' 
  | 'Stimulant' 
  | 'Opioid'
  | 'Beta Blocker'
  | 'Other';

export const MEDICATION_TYPES: MedicationType[] = [
  'SSRI', 'SNRI', 'MAOI', 'TCA', 
  'Benzodiazepine', 'Antipsychotic', 'Mood Stabilizer', 'Stimulant', 'Opioid',
  'Beta Blocker', 'Other'
];

export const MEDICATION_TYPE_TO_SUBSTANCE_CLASS: Record<MedicationType, string> = {
  'SSRI': 'SSRI',
  'SNRI': 'SNRI',
  'MAOI': 'MAOI',
  'TCA': 'TCA',
  'Benzodiazepine': 'Benzodiazepine',
  'Antipsychotic': 'Antipsychotic',
  'Mood Stabilizer': 'Mood Stabilizer',
  'Stimulant': 'Stimulant',
  'Opioid': 'Opioid',
  'Beta Blocker': 'Beta Blocker',
  'Other': 'Other',
};

/**
 * Reverse map: substance class → MedicationType.
 * Used to auto-fill the medicationType field when a user picks a substance
 * whose `class` matches a known psychiatric medication class.
 */
export const SUBSTANCE_CLASS_TO_MEDICATION_TYPE: Record<string, MedicationType> = {
  'SSRI': 'SSRI',
  'SNRI': 'SNRI',
  'MAOI': 'MAOI',
  'TCA': 'TCA',
  'Tricyclic Antidepressant': 'TCA',
  'Benzodiazepine': 'Benzodiazepine',
  'Antipsychotic': 'Antipsychotic',
  'Mood Stabilizer': 'Mood Stabilizer',
  'Stimulant': 'Stimulant',
  'Opioid': 'Opioid',
  'Beta Blocker': 'Beta Blocker',
};

export interface UserMedication {
  id: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  route: string;
  prescribedFor?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  medicationType?: MedicationType;
  /**
   * Optional link to a substance in the built-in substance database
   * (e.g. "sertraline", "fluoxetine"). When present, the medication
   * inherits interaction data, dose ranges, and class info from the
   * linked substance, while keeping its user-specific dosage/frequency.
   */
  linkedSubstanceId?: string;
}

export interface Contraindication {
  medicationId: string;
  medicationName: string;
  substanceName: string;
  substanceId: string;
  severity: 'dangerous' | 'unsafe' | 'caution';
  description: string;
  source: 'tripsit' | 'substance-data' | 'manual';
}

interface MedicationState {
  medications: UserMedication[];
  deletedIds: Set<string>;
  contraindications: Contraindication[];
  loaded: boolean;
  
  initialize: () => void;
  addMedication: (med: UserMedication) => void;
  updateMedication: (id: string, patch: Partial<UserMedication>) => void;
  deleteMedication: (id: string) => void;
  setMedicationsFromSync: (medications: UserMedication[], deletedIds: Set<string>) => void;
  checkContraindications: (substanceIds: string[]) => Contraindication[];
}

const KEY = 'drugucopia-user-medications';
const DELETED_KEY = 'drugucopia-deleted-user-medications';

function load(): UserMedication[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function loadDeleted(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || '[]')); } catch { return new Set(); }
}

function save(list: UserMedication[], deletedIds?: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    if (deletedIds) localStorage.setItem(DELETED_KEY, JSON.stringify([...deletedIds]));
  } catch {}
}

export const useMedicationStore = create<MedicationState>((set, get) => ({
  medications: [],
  deletedIds: new Set(),
  contraindications: [],
  loaded: false,

  initialize: () => {
    if (get().loaded) return;
    set({ medications: load(), deletedIds: loadDeleted(), loaded: true });
  },

  addMedication: (med) => {
    const deletedIds = new Set(get().deletedIds);
    deletedIds.delete(med.id);
    const next = [...get().medications.filter((item) => item.id !== med.id), med];
    save(next, deletedIds);
    set({ medications: next, deletedIds });
  },

  updateMedication: (id, patch) => {
    const next = get().medications.map(m => m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m);
    save(next);
    set({ medications: next });
  },

  deleteMedication: (id) => {
    const next = get().medications.filter(m => m.id !== id);
    const deletedIds = new Set(get().deletedIds).add(id);
    save(next, deletedIds);
    set({ medications: next, deletedIds });
  },

  setMedicationsFromSync: (medications, deletedIds) => {
    save(medications, deletedIds);
    set({ medications, deletedIds, loaded: true });
  },

  checkContraindications: (substanceIds) => {
    const meds = get().medications.filter(m => m.isActive);
    const substanceNames = substanceIds
      .map(id => getSubstanceByIdAll(id)?.name.toLowerCase())
      .filter(Boolean) as string[];
    
    if (substanceNames.length === 0) return [];
    
    const medNames = meds.map(m => m.name.toLowerCase());
    const medTypeClasses = meds
      .filter(m => m.medicationType)
      .map(m => MEDICATION_TYPE_TO_SUBSTANCE_CLASS[m.medicationType!].toLowerCase());
    const allNames = [...substanceNames, ...medNames, ...medTypeClasses];
    const results = checkInteractions(allNames);
    
    const warnings: Contraindication[] = [];
    for (const pair of results.pairs) {
      const isMedA = medNames.includes(pair.substanceA.toLowerCase()) || medTypeClasses.includes(pair.substanceA.toLowerCase());
      const isMedB = medNames.includes(pair.substanceB.toLowerCase()) || medTypeClasses.includes(pair.substanceB.toLowerCase());
      
      if ((isMedA || isMedB) && pair.severity !== 'low-risk') {
        const medName = isMedA ? pair.substanceA : pair.substanceB;
        const subName = isMedA ? pair.substanceB : pair.substanceA;
        const med = meds.find(m => 
          m.name.toLowerCase() === medName.toLowerCase() || 
          (m.medicationType && MEDICATION_TYPE_TO_SUBSTANCE_CLASS[m.medicationType].toLowerCase() === medName.toLowerCase())
        );
        
        if (med) {
          const subId = substanceIds.find(id => 
            getSubstanceByIdAll(id)?.name.toLowerCase() === subName.toLowerCase()
          ) || '';
          
          warnings.push({
            medicationId: med.id,
            medicationName: med.name,
            substanceName: subName,
            substanceId: subId,
            severity: pair.severity,
            description: pair.description || pair.matchedTerms.join(', '),
            source: pair.sources[0] as Contraindication['source'],
          });
        }
      }
    }
    set({ contraindications: warnings });
    return warnings;
  },
}));

// ─── MEDICATION ↔ SUBSTANCE CONVERSION HELPERS ───────────────────────────────

/**
 * Prefix used to namespace medication IDs when they appear alongside
 * regular substance IDs (e.g. in the dose logger's substance selector
 * or the interaction checker). This prevents ID collisions between a
 * built-in substance named "sertraline" and a user medication whose
 * `linkedSubstanceId` happens to be "sertraline".
 */
export const MEDICATION_ID_PREFIX = 'med-';

/** Build a namespaced selector ID from a medication's UUID. */
export function toMedicationSelectorId(medId: string): string {
  return `${MEDICATION_ID_PREFIX}${medId}`;
}

/** Returns true if the given selector ID refers to a user medication. */
export function isMedicationSelectorId(id: string): boolean {
  return id.startsWith(MEDICATION_ID_PREFIX);
}

/** Extract the raw medication UUID from a namespaced selector ID. */
export function fromMedicationSelectorId(id: string): string {
  return id.slice(MEDICATION_ID_PREFIX.length);
}

/**
 * Convert a UserMedication into a Substance-shaped object so that the
 * existing interaction-checker pipeline (which expects Substance[]) can
 * reason about it. If the medication has a `linkedSubstanceId`, we
 * inherit the linked substance's `interactions`, `class`, and
 * `routeData` so the medication behaves exactly like the underlying
 * drug for interaction purposes. Otherwise we synthesize a minimal
 * Substance using the medication's `medicationType` as the class so
 * that TripSit class-based combos (e.g. "SSRI × MDMA") still match.
 */
export function medicationToSubstance(med: UserMedication): Substance {
  const linked = med.linkedSubstanceId
    ? getSubstanceByIdAll(med.linkedSubstanceId)
    : undefined;

  if (linked) {
    // Inherit interaction data from the linked substance, but keep the
    // user-facing name/dosage from the medication so warnings read
    // "Prozac" instead of "Fluoxetine" when the user typed Prozac.
    return {
      ...linked,
      id: toMedicationSelectorId(med.id),
      name: med.name,
      commonNames: Array.from(new Set([
        med.name,
        ...(linked.commonNames || []),
        ...(med.genericName ? [med.genericName] : []),
      ])),
      aliases: Array.from(new Set([
        med.name,
        ...(linked.aliases || []),
        ...(med.genericName ? [med.genericName] : []),
      ])),
      categories: ['medications' as any, ...(linked.categories || [])],
    };
  }

  // No linked substance — synthesize a minimal Substance whose `class`
  // is the medication type (e.g. "SSRI"). TripSit combo lookups will
  // resolve this through resolveTripsitClasses(), which maps class
  // names to TripSit combo keys.
  const cls = med.medicationType
    ? MEDICATION_TYPE_TO_SUBSTANCE_CLASS[med.medicationType]
    : 'Other';

  return {
    id: toMedicationSelectorId(med.id),
    name: med.name,
    commonNames: med.genericName ? [med.genericName] : [],
    categories: ['medications'],
    class: cls,
    description: med.notes || `User medication (${med.medicationType || 'unclassified'})`,
    effects: { positive: [], neutral: [], negative: [] },
    interactions: { dangerous: [], unsafe: [], uncertain: [], crossTolerances: [] },
    harmReduction: [],
    legality: 'unknown',
    chemistry: { formula: '', molecularWeight: '', class: cls },
    history: null,
    afterEffects: '',
    riskLevel: 'none',
    aliases: med.genericName ? [med.genericName] : [],
    ...(med.route ? { routes: [med.route] } : {}),
  };
}

/**
 * Convert all (or all active) medications to Substance[] for use in
 * interaction checks. Used by the dose logger modal and the
 * interactions page.
 */
export function getMedicationsAsSubstances(opts?: { onlyActive?: boolean }): Substance[] {
  const state = useMedicationStore.getState();
  if (!state.loaded) state.initialize();
  const meds = opts?.onlyActive
    ? state.medications.filter(m => m.isActive)
    : state.medications;
  return meds.map(medicationToSubstance);
}

/**
 * Look up a single medication-derived substance by its namespaced
 * selector ID (i.e. one that starts with MEDICATION_ID_PREFIX).
 */
export function getMedicationSubstanceById(selectorId: string): Substance | undefined {
  if (!isMedicationSelectorId(selectorId)) return undefined;
  const medId = fromMedicationSelectorId(selectorId);
  const state = useMedicationStore.getState();
  if (!state.loaded) state.initialize();
  const med = state.medications.find(m => m.id === medId);
  return med ? medicationToSubstance(med) : undefined;
}

/**
 * Returns the raw UserMedication behind a namespaced selector ID.
 * Useful when the caller needs the original dosage/frequency fields.
 */
export function getMedicationBySelectorId(selectorId: string): UserMedication | undefined {
  if (!isMedicationSelectorId(selectorId)) return undefined;
  const medId = fromMedicationSelectorId(selectorId);
  const state = useMedicationStore.getState();
  if (!state.loaded) state.initialize();
  return state.medications.find(m => m.id === medId);
}
