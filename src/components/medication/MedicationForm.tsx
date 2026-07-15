'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ComboboxOption } from '@/components/ui/combobox';
import { X, Pill, Link2, Link2Off } from 'lucide-react';
import type { UserMedication, MedicationType } from '@/store/medication-store';
import {
  MEDICATION_TYPES,
  SUBSTANCE_CLASS_TO_MEDICATION_TYPE,
} from '@/store/medication-store';
import { getSubstancesByCategory } from '@/lib/substances/index';

interface MedicationFormProps {
  initialData?: UserMedication;
  onClose: () => void;
  onSubmit: (data: Omit<UserMedication, 'id' | 'updatedAt'>) => void;
}

const FREQUENCIES = ['daily', 'twice daily', 'three times daily', 'four times daily', 'weekly', 'as needed'];
const ROUTES = ['oral', 'sublingual', 'intranasal', 'inhalation', 'transdermal', 'injection', 'rectal'];

/**
 * Auto-pick a MedicationType from a substance's `class` field.
 * Returns undefined if the class doesn't map to a known type.
 */
function inferMedicationTypeFromClass(cls: string | undefined): MedicationType | undefined {
  if (!cls) return undefined;
  // Try exact match first ("SSRI" → SSRI).
  if (SUBSTANCE_CLASS_TO_MEDICATION_TYPE[cls]) return SUBSTANCE_CLASS_TO_MEDICATION_TYPE[cls];
  // Try case-insensitive match.
  const lower = cls.toLowerCase();
  for (const [k, v] of Object.entries(SUBSTANCE_CLASS_TO_MEDICATION_TYPE)) {
    if (k.toLowerCase() === lower) return v;
  }
  // Common synonyms seen in the substance DB.
  if (/(selective serotonin reuptake inhibitor)/i.test(cls)) return 'SSRI';
  if (/(serotonin.*norepinephrine reuptake inhibitor)/i.test(cls)) return 'SNRI';
  if (/(monoamine oxidase inhibitor)/i.test(cls)) return 'MAOI';
  if (/(tricyclic)/i.test(cls)) return 'TCA';
  if (/(benzodiazepine|benzo)/i.test(cls)) return 'Benzodiazepine';
  if (/(antipsychotic|neuroleptic)/i.test(cls)) return 'Antipsychotic';
  if (/(mood stabilizer|anticonvulsant)/i.test(cls)) return 'Mood Stabilizer';
  if (/(stimulant|amphetamine)/i.test(cls)) return 'Stimulant';
  if (/(opioid|opiate)/i.test(cls)) return 'Opioid';
  if (/(beta.?blocker)/i.test(cls)) return 'Beta Blocker';
  return undefined;
}

export function MedicationForm({ initialData, onClose, onSubmit }: MedicationFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [genericName, setGenericName] = useState(initialData?.genericName || '');
  const [dosage, setDosage] = useState(initialData?.dosage || '');
  const [frequency, setFrequency] = useState(initialData?.frequency || 'daily');
  const [route, setRoute] = useState(initialData?.route || 'oral');
  const [prescribedFor, setPrescribedFor] = useState(initialData?.prescribedFor || '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [medicationType, setMedicationType] = useState<MedicationType | ''>(initialData?.medicationType || '');
  const [linkedSubstanceId, setLinkedSubstanceId] = useState<string | undefined>(initialData?.linkedSubstanceId);

  // Build a Combobox option list from all substances in the "medications"
  // category (built-in psychiatric medication data: sertraline, fluoxetine,
  // aripiprazole, etc.). Sorted alphabetically by display name.
  const medicationSubstanceOptions: ComboboxOption[] = useMemo(() => {
    return getSubstancesByCategory('medications')
      .map((s) => ({
        value: s.id,
        label: s.name,
        keywords: [
          ...s.commonNames,
          ...(s.aliases || []),
          s.class,
        ].filter(Boolean) as string[],
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Look up the linked substance on demand for the "linked" badge.
  const linkedSubstance = useMemo(
    () => linkedSubstanceId
      ? getSubstancesByCategory('medications').find(s => s.id === linkedSubstanceId)
      : undefined,
    [linkedSubstanceId],
  );

  /**
   * When the user picks a substance from the medications list, pre-fill
   * the name, generic name, and medicationType from the substance's
   * built-in data. The user can still override any of these fields
   * afterwards — picking a substance is just a convenience.
   *
   * Special case: selecting the empty/blank value (which the Combobox
   * emits when the user clears the field) unlinks the medication from
   * the substance without clearing the name field.
   */
  const handleLinkSubstance = (value: string) => {
    if (!value) {
      setLinkedSubstanceId(undefined);
      return;
    }
    const sub = getSubstancesByCategory('medications').find(s => s.id === value);
    if (!sub) {
      setLinkedSubstanceId(value);
      return;
    }
    setLinkedSubstanceId(sub.id);
    // Only overwrite name if it's empty or still matches the previous
    // linked substance's name (i.e. the user hasn't manually edited it).
    setName(prev => {
      const prevLinked = linkedSubstanceId
        ? getSubstancesByCategory('medications').find(s => s.id === linkedSubstanceId)
        : undefined;
      if (!prev || prev === prevLinked?.name) return sub.name;
      return prev;
    });
    // Pre-fill generic name from the first non-self common name.
    setGenericName(prev => prev || sub.commonNames.find(cn => cn.toLowerCase() !== sub.name.toLowerCase()) || '');
    // Infer medication type from the substance's class field.
    const inferred = inferMedicationTypeFromClass(sub.class);
    if (inferred) {
      setMedicationType(prev => prev || inferred);
    }
  };

  const handleUnlink = () => {
    setLinkedSubstanceId(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim()) return;

    const now = new Date().toISOString();
    onSubmit({
      name: name.trim(),
      genericName: genericName.trim() || undefined,
      dosage: dosage.trim(),
      frequency,
      route,
      prescribedFor: prescribedFor.trim() || undefined,
      isActive,
      notes: notes.trim() || undefined,
      startDate: initialData?.startDate || now,
      endDate: initialData?.endDate,
      createdAt: now,
      medicationType: medicationType || undefined,
      linkedSubstanceId: linkedSubstanceId || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-base-100/95 backdrop-blur-sm p-4 flex items-start sm:items-center justify-center"
      role="dialog"
    >
      <Card className="w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-base-100 z-20 rounded-t-xl">
          <h2 className="text-xl font-semibold">{initialData ? 'Edit Medication' : 'Add Medication'}</h2>
          <Button intent="ghost" size="sm" iconOnly onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Substance link picker — lets the user pick a built-in
              psychiatric medication (sertraline, fluoxetine, etc.) so
              that the medication inherits interaction data, dose ranges,
              and class info from the substance database. */}
          <div className="form-control">
            <Label htmlFor="linkedSubstance" className="flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5" />
              Link to known medication substance (optional)
            </Label>
            {/*
              Native <select> instead of <Combobox>: the Combobox's
              absolute-positioned dropdown was being clipped/covered by
              sibling form fields due to stacking-context interactions
              with the modal's backdrop-blur + overflow-y-auto, leaving
              only 1 visible option. A native select uses the platform
              dropdown which is always rendered on top and is better UX
              on mobile (native picker wheel). Since allowCustom={false},
              we lose nothing by switching.
            */}
            <select
              id="linkedSubstance"
              value={linkedSubstanceId || ''}
              onChange={e => handleLinkSubstance(e.target.value)}
              className="select select-bordered w-full h-10 font-normal"
            >
              <option value="">— Select a medication (optional) —</option>
              {medicationSubstanceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}{opt.keywords?.length ? ` (${opt.keywords[0]})` : ''}
                </option>
              ))}
            </select>
            {linkedSubstance ? (
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <p className="text-xs text-base-content/70 flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-success" />
                  Linked to <strong className="text-base-content">{linkedSubstance.name}</strong>
                  {linkedSubstance.class && (
                    <Badge variant="outline" className="ml-1 text-[10px] py-0">{linkedSubstance.class}</Badge>
                  )}
                </p>
                <Button
                  type="button"
                  intent="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={handleUnlink}
                >
                  <Link2Off className="w-3 h-3 mr-1" />
                  Unlink
                </Button>
              </div>
            ) : (
              <p className="text-xs text-base-content/60 mt-1">
                Linking lets the interaction checker use this medication&apos;s full interaction data.
                You can still type a custom name below.
              </p>
            )}
          </div>

          <div className="form-control">
            <Label htmlFor="name">Medication Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="e.g., Prozac"
            />
          </div>
          <div className="form-control">
            <Label htmlFor="genericName">Generic Name</Label>
            <Input
              id="genericName"
              value={genericName}
              onChange={e => setGenericName(e.target.value)}
              placeholder="e.g., Fluoxetine"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <Label htmlFor="dosage">Dosage *</Label>
              <Input id="dosage" value={dosage} onChange={e => setDosage(e.target.value)} required placeholder="e.g., 20mg" />
            </div>
            <div className="form-control">
              <Label htmlFor="route">Route</Label>
              <Select id="route" value={route} onChange={e => setRoute(e.target.value)}>
                {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
          </div>
          <div className="form-control">
            <Label htmlFor="frequency">Frequency</Label>
            <Select id="frequency" value={frequency} onChange={e => setFrequency(e.target.value)}>
              {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
            </Select>
          </div>
          <div className="form-control">
            <Label htmlFor="medicationType">Medication Class</Label>
            <Select
              id="medicationType"
              value={medicationType}
              onChange={e => setMedicationType(e.target.value as MedicationType)}
            >
              <option value="">Select class...</option>
              {MEDICATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <p className="text-xs text-base-content/60 mt-1">
              Used for class-level interaction checks (e.g. SSRI × MDMA, MAOI × tyramine).
              Auto-filled when you link a known substance.
            </p>
          </div>
          <div className="form-control">
            <Label htmlFor="prescribedFor">Prescribed For</Label>
            <Input id="prescribedFor" value={prescribedFor} onChange={e => setPrescribedFor(e.target.value)} placeholder="e.g., Depression, Anxiety" />
          </div>
          <div className="form-control">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Additional notes..." />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="checkbox checkbox-primary" />
            <Label htmlFor="isActive" className="cursor-pointer">Active medication</Label>
          </div>
          <div className="flex gap-3 pt-2 sticky bottom-0 bg-base-100 -mx-4 px-4 py-3 border-t">
            <Button intent="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button intent="primary" type="submit" className="flex-1">{initialData ? 'Save Changes' : 'Add Medication'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
