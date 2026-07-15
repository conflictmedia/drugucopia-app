'use client';

import { useState, useEffect } from 'react';
import { useMedicationStore } from '@/store/medication-store';
import { MedicationForm } from './MedicationForm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash, Pill, AlertTriangle, Link2 } from 'lucide-react';
import * as substancesIndex from '@/lib/substances/index';
import type { Substance } from '@/lib/substances/types';

// Defensive resolver: prefer getSubstanceByIdAll (which includes the
// medications category) when the submodule exposes it; fall back to
// getSubstanceById for older submodule versions.
const getSubstanceByIdAll: (id: string) => Substance | undefined =
  (substancesIndex as any).getSubstanceByIdAll ?? substancesIndex.getSubstanceById;

export function MedicationList() {
  const { medications, addMedication, updateMedication, deleteMedication, initialize } = useMedicationStore();
  const [showForm, setShowForm] = useState(false);
  const [editingMed, setEditingMed] = useState<typeof medications[0] | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const resetForm = () => {
    setEditingMed(null);
    setShowForm(false);
  };

  const handleSubmit = (data: Omit<typeof medications[0], 'id' | 'updatedAt'>) => {
    if (editingMed) {
      updateMedication(editingMed.id, data);
    } else {
      addMedication({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    resetForm();
  };

  // Pull the linked substance for each medication ONCE per render so
  // we can show "Linked to Sertraline" badges cheaply. This is O(n)
  // in the number of medications, which is fine for typical use.
  const linkedSubstanceNames: Record<string, string | undefined> = {};
  for (const med of medications) {
    if (med.linkedSubstanceId) {
      linkedSubstanceNames[med.id] = getSubstanceByIdAll(med.linkedSubstanceId)?.name;
    }
  }

  // Count active vs total for the header summary.
  const activeCount = medications.filter(m => m.isActive).length;

  // Per-class color theming for the medicationType badge. Falls back
  // to a neutral color for "Other" / unknown.
  const typeBadgeClass = (type?: string): string => {
    switch (type) {
      case 'SSRI':
      case 'SNRI':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30';
      case 'MAOI':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30';
      case 'TCA':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30';
      case 'Benzodiazepine':
        return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30';
      case 'Antipsychotic':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30';
      case 'Mood Stabilizer':
        return 'bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30';
      case 'Stimulant':
        return 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30';
      case 'Opioid':
        return 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30';
      case 'Beta Blocker':
        return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300 border-zinc-500/30';
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Medications</h1>
          <p className="text-base-content/70 mt-1">
            Manage prescription medications for interaction checking
            {medications.length > 0 && (
              <span className="ml-2 text-xs">
                ({activeCount} active / {medications.length} total)
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => { setEditingMed(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Medication
        </Button>
      </div>

      {showForm && (
        <MedicationForm
          initialData={editingMed || undefined}
          onClose={resetForm}
          onSubmit={handleSubmit}
        />
      )}

      {medications.length === 0 ? (
        <Card className="p-8 text-center">
          <Pill className="h-12 w-12 mx-auto text-base-content/30" />
          <h3 className="mt-4 text-lg font-semibold">No medications yet</h3>
          <p className="text-base-content/60 mt-1">
            Add your prescription medications to enable interaction warnings when logging doses or checking interactions.
            You can link a medication to a known substance (Sertraline, Fluoxetine, …) to inherit its full interaction data.
          </p>
          <Button className="mt-4" onClick={() => { setEditingMed(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add First Medication
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {medications.map(med => (
            <Card key={med.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold truncate">{med.name}</h3>
                    {med.genericName && <Badge variant="default">{med.genericName}</Badge>}
                    {med.medicationType && (
                      <Badge
                        variant="outline"
                        className={`text-xs border ${typeBadgeClass(med.medicationType)}`}
                      >
                        {med.medicationType}
                      </Badge>
                    )}
                    {med.linkedSubstanceId && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-success/10 text-success border-success/30 gap-1"
                        title={`Inherits interaction data from ${linkedSubstanceNames[med.id] || med.linkedSubstanceId}`}
                      >
                        <Link2 className="w-3 h-3" />
                        {linkedSubstanceNames[med.id] || 'Linked'}
                      </Badge>
                    )}
                    <Badge variant={med.isActive ? 'success' : 'outline'}>
                      {med.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-base-content/70">
                    {med.dosage} • {med.frequency} • {med.route}
                  </p>
                  {med.prescribedFor && <p className="text-xs text-base-content/50 mt-1">For: {med.prescribedFor}</p>}
                  {med.notes && <p className="text-xs text-base-content/50 mt-1 italic line-clamp-2">{med.notes}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" iconOnly onClick={() => { setEditingMed(med); setShowForm(true); }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" iconOnly onClick={() => deleteMedication(med.id)}>
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* Helper banner explaining how medications feed back into
              the rest of the app — visible only when there is at least
              one medication on file. */}
          <div className="rounded-lg border border-info/30 bg-info/5 p-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <div className="text-base-content/70">
              <span className="font-medium text-base-content">Active medications</span> are automatically included
              in interaction checks on the <a href="/interactions" className="link link-primary">Interactions</a> page
              and trigger warnings in the <a href="/dose-log" className="link link-primary">dose logger</a> when you
              log a substance that interacts with them.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
