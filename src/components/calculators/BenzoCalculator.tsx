'use client';
import { useState } from 'react';
import { BENZODIAZEPINES, convertDose, getBenzoInfo } from '@/lib/calculators/benzo-equivalence';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Info, AlertTriangle } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

export function BenzoCalculator() {
  const [fromBenzo, setFromBenzo] = useState('alprazolam');
  const [toBenzo, setToBenzo] = useState('diazepam');
  const [fromDose, setFromDose] = useState(1);
  const [result, setResult] = useState<ReturnType<typeof convertDose> | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const handleConvert = () => {
    const res = convertDose(fromBenzo, fromDose, toBenzo);
    setResult(res);
  };

  const fromInfo = getBenzoInfo(fromBenzo);
  const toInfo = getBenzoInfo(toBenzo);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Benzodiazepine Equivalence Calculator</h1>
        <p className="text-base-content/70 mt-2">
          Convert doses between benzodiazepines using standard equivalence ratios (diazepam 10mg = 1x reference)
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="form-control">
            <Label>From Benzodiazepine</Label>
            <Select value={fromBenzo} onChange={e => setFromBenzo(e.target.value)}>
              {BENZODIAZEPINES.map(b => (
                <option key={b.genericName} value={b.genericName}>
                  {b.name} ({b.equivalenceMg}mg = 10mg diazepam)
                </option>
              ))}
            </Select>
          </div>

          <div className="form-control md:col-span-1 flex items-center justify-center">
            <ArrowRightLeft className="h-8 w-8 text-primary" />
          </div>

          <div className="form-control">
            <Label>To Benzodiazepine</Label>
            <Select value={toBenzo} onChange={e => setToBenzo(e.target.value)}>
              {BENZODIAZEPINES.map(b => (
                <option key={b.genericName} value={b.genericName}>
                  {b.name} ({b.equivalenceMg}mg = 10mg diazepam)
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="form-control">
          <Label>Dose to Convert (mg)</Label>
          <Input
            type="number"
            step="0.125"
            min="0.01"
            value={fromDose}
            onChange={e => setFromDose(parseFloat(e.target.value) || 0)}
            placeholder="Enter dose in mg"
          />
        </div>

        <Button variant="default" className="w-full" onClick={handleConvert}>
          Calculate Equivalent Dose
        </Button>

        {result && (
          <div className="bg-base-200/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-lg">
              <span>{fromDose} mg {fromInfo?.name.split(' ')[0]}</span>
              <ArrowRightLeft className="h-6 w-6 text-primary mx-2" />
              <span className="font-bold text-primary">{result.equivalentDose} mg {toInfo?.name.split(' ')[0]}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-base-content/70">
              <div>
                <span className="font-medium">Diazepam Equivalent:</span>{' '}
                {(fromDose / (fromInfo?.equivalenceMg || 1) * 10).toFixed(1)} mg
              </div>
              <div>
                <span className="font-medium">Potency Ratio:</span>{' '}
                1 mg {fromInfo?.name.split(' ')[0]} ≈ {result.equivalentDose / fromDose} mg {toInfo?.name.split(' ')[0]}
              </div>
            </div>

            <Alert variant="info" soft>
              <Info className="h-5 w-5" />
              <div className="text-sm">
                <strong>Note:</strong> Equivalence ratios are approximate clinical guidelines. Individual response varies significantly.
                Always consult a healthcare provider before changing medications. Cross-tolerance is incomplete.
              </div>
            </Alert>
          </div>
        )}
      </Card>

      {/* Reference Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Equivalence Reference Table</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-sm">
            <thead>
              <tr>
                <th>Benzodiazepine</th>
                <th className="text-right">Equiv. Dose (mg)</th>
                <th className="text-right">Potency vs Diazepam</th>
                <th>Half-Life (hrs)</th>
                <th>Onset</th>
              </tr>
            </thead>
            <tbody>
              {BENZODIAZEPINES.map(b => (
                <tr key={b.genericName}>
                  <td className="font-medium">{b.name}</td>
                  <td className="text-right">{b.equivalenceMg}</td>
                  <td className="text-right">{b.potencyRatio}x</td>
                  <td className="text-right">{b.halfLifeHours.min}–{b.halfLifeHours.max}</td>
                  <td>
                    <Badge variant="outline" className="gap-1">
                      {b.onset === 'rapid' && <span className="text-xs">⚡</span>}
                      {b.onset === 'intermediate' && <span className="text-xs">⏱</span>}
                      {b.onset === 'slow' && <span className="text-xs">🐌</span>}
                      {b.onset.charAt(0).toUpperCase() + b.onset.slice(1)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Alert variant="warning" soft>
          <AlertTriangle className="h-5 w-5" />
          <div className="text-sm">
            <strong>Clinical Disclaimer:</strong> These are approximate equivalence ratios for clinical reference only.
            Benzodiazepines have incomplete cross-tolerance. Conversion should be done under medical supervision with gradual tapering.
            Higher potency benzos (alprazolam, clonazepam, triazolam) carry greater dependence and withdrawal risk.
          </div>
        </Alert>
      </Card>
    </div>
  );
}