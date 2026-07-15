'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  Wine,
  ArrowRightLeft,
  Info,
  AlertTriangle,
  RotateCcw,
  Scale,
  Beaker,
  GlassWater,
} from 'lucide-react';
import {
  SHOT_SIZES,
  BEVERAGE_PRESETS,
  STANDARD_DRINKS,
  shotsToGrams,
  gramsToShots,
  getShotSize,
  getBeveragePreset,
  roundTo,
  ETHANOL_DENSITY_G_PER_ML,
} from '@/lib/calculators/alcohol';

type Mode = 'shots-to-grams' | 'grams-to-shots';

export default function AlcoholCalculatorPage() {
  // ─── Shared inputs ────────────────────────────────────────────────────────
  const [shotSizeId, setShotSizeId] = useState('us-single');
  const [shotVolumeMl, setShotVolumeMl] = useState(
    () => getShotSize('us-single')!.volumeMl,
  );
  const [beverageId, setBeverageId] = useState('spirits');
  const [abv, setAbv] = useState(() => getBeveragePreset('spirits')!.abv);

  // ─── Directional inputs ───────────────────────────────────────────────────
  const [shots, setShots] = useState(2);
  const [targetGrams, setTargetGrams] = useState(14);
  const [mode, setMode] = useState<Mode>('shots-to-grams');

  // ─── Preset change handlers ───────────────────────────────────────────────
  const handleShotSizeChange = (id: string) => {
    setShotSizeId(id);
    const preset = getShotSize(id);
    if (preset) setShotVolumeMl(roundTo(preset.volumeMl, 2));
  };

  const handleBeverageChange = (id: string) => {
    setBeverageId(id);
    const preset = getBeveragePreset(id);
    if (preset) setAbv(preset.abv);
  };

  const handleReset = () => {
    setShotSizeId('us-single');
    setShotVolumeMl(roundTo(getShotSize('us-single')!.volumeMl, 2));
    setBeverageId('spirits');
    setAbv(getBeveragePreset('spirits')!.abv);
    setShots(2);
    setTargetGrams(14);
    setMode('shots-to-grams');
  };

  // ─── Computed results ─────────────────────────────────────────────────────
  const result = useMemo(() => {
    return shotsToGrams({ shots, shotVolumeMl, abv });
  }, [shots, shotVolumeMl, abv]);

  const reverseResult = useMemo(() => {
    return gramsToShots(targetGrams, shotVolumeMl, abv);
  }, [targetGrams, shotVolumeMl, abv]);

  const isCustomShot = shotSizeId === 'custom';
  const isCustomBeverage = beverageId === 'custom';

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center gap-2">
          <Wine className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Alcohol Calculator</h1>
        </div>
        <p className="text-base-content/70 max-w-2xl mx-auto">
          Convert shots of an alcoholic beverage into grams of pure ethanol — the standard
          unit used for tracking alcohol consumption. Calculation uses beverage volume, ABV,
          and the density of ethanol ({ETHANOL_DENSITY_G_PER_ML} g/mL).
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex justify-center">
        <div role="tablist" className="tabs tabs-boxed">
          <a
            role="tab"
            className={`tab ${mode === 'shots-to-grams' ? 'tab-active' : ''}`}
            onClick={() => setMode('shots-to-grams')}
          >
            Shots → Grams
          </a>
          <a
            role="tab"
            className={`tab ${mode === 'grams-to-shots' ? 'tab-active' : ''}`}
            onClick={() => setMode('grams-to-shots')}
          >
            Grams → Shots
          </a>
        </div>
      </div>

      {/* Main calculator card */}
      <Card className="p-6 space-y-6">
        {/* Beverage & shot size selectors — shared */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <GlassWater className="h-4 w-4" /> Beverage Type
            </Label>
            <Select value={beverageId} onChange={(e) => handleBeverageChange(e.target.value)}>
              {BEVERAGE_PRESETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} ({b.abv}% ABV)
                </option>
              ))}
            </Select>
            {isCustomBeverage ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={abv}
                  onChange={(e) => setAbv(parseFloat(e.target.value) || 0)}
                  placeholder="ABV %"
                />
                <span className="text-sm text-base-content/60 whitespace-nowrap">% ABV</span>
              </div>
            ) : (
              <p className="text-xs text-base-content/60">
                {getBeveragePreset(beverageId)?.notes}
              </p>
            )}
          </div>

          <div className="form-control space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Beaker className="h-4 w-4" /> Shot Size
            </Label>
            <Select value={shotSizeId} onChange={(e) => handleShotSizeChange(e.target.value)}>
              {SHOT_SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({roundTo(s.volumeMl, 1)} mL)
                </option>
              ))}
            </Select>
            {isCustomShot ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  step="0.1"
                  value={shotVolumeMl}
                  onChange={(e) => setShotVolumeMl(parseFloat(e.target.value) || 0)}
                  placeholder="Shot volume"
                />
                <span className="text-sm text-base-content/60 whitespace-nowrap">mL</span>
              </div>
            ) : (
              <p className="text-xs text-base-content/60">
                {getShotSize(shotSizeId)?.notes}
              </p>
            )}
          </div>
        </div>

        <div className="divider my-0" />

        {/* Directional input + result */}
        {mode === 'shots-to-grams' ? (
          <ShotsToGramsPanel
            shots={shots}
            setShots={setShots}
            result={result}
          />
        ) : (
          <GramsToShotsPanel
            targetGrams={targetGrams}
            setTargetGrams={setTargetGrams}
            reverseResult={reverseResult}
            shotVolumeMl={shotVolumeMl}
            abv={abv}
          />
        )}

        {/* Reset */}
        <Button variant="ghost" size="sm" className="w-full" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" /> Reset to defaults
        </Button>
      </Card>

      {/* Formula / how it works */}
      <Card className="p-6 space-y-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" /> How the conversion works
        </h2>
        <p className="text-sm text-base-content/80 leading-relaxed">
          A &ldquo;shot&rdquo; is a measure of <strong>volume</strong>, while grams measure the
          <strong> mass of pure ethanol</strong>. To bridge the two we need the beverage&rsquo;s
          alcohol-by-volume (ABV) and the physical density of ethanol
          ({ETHANOL_DENSITY_G_PER_ML} g/mL at 20°C). The calculation proceeds in two physical
          steps: first the volume of pure ethanol is extracted from the total beverage volume,
          then that ethanol volume is converted to mass using density.
        </p>
        <div className="bg-base-200/60 rounded-lg p-4 font-mono text-sm space-y-1">
          <div>ethanol_volume_ml = shots × shot_volume_ml × (abv ÷ 100)</div>
          <div>ethanol_grams    = ethanol_volume_ml × {ETHANOL_DENSITY_G_PER_ML}</div>
        </div>
        <p className="text-sm text-base-content/80 leading-relaxed">
          For example, a single US shot (44.4 mL) of 40% ABV vodka contains
          44.4 × 0.40 × {ETHANOL_DENSITY_G_PER_ML} ≈ <strong>14.0 g</strong> of ethanol —
          exactly one US standard drink.
        </p>
      </Card>

      {/* Standard drink reference */}
      <Card className="p-6 space-y-3">
        <h2 className="text-xl font-semibold">Standard Drink References</h2>
        <p className="text-sm text-base-content/70">
          Different countries define a &ldquo;standard drink&rdquo; by a different mass of pure
          ethanol. Use these to contextualise your gram result against drinking guidelines.
        </p>
        <table className="table table-zebra w-full text-sm">
          <thead>
            <tr>
              <th>Region</th>
              <th className="text-right">Grams per drink</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-medium">United States</td>
              <td className="text-right">14 g</td>
              <td>1.5 fl oz spirits, 5 fl oz wine, 12 fl oz beer</td>
            </tr>
            <tr>
              <td className="font-medium">United Kingdom</td>
              <td className="text-right">8 g (1 unit)</td>
              <td>25 mL single of 40% spirits</td>
            </tr>
            <tr>
              <td className="font-medium">Australia / WHO</td>
              <td className="text-right">10 g</td>
              <td>30 mL spirits, 100 mL wine, 285 mL beer</td>
            </tr>
            <tr>
              <td className="font-medium">Canada</td>
              <td className="text-right">13.45 g</td>
              <td>43 mL spirits, 142 mL wine, 341 mL beer</td>
            </tr>
          </tbody>
        </table>

        <Alert variant="info" soft>
          <Info className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <strong>Guidelines:</strong> Many health authorities recommend no more than
            ~20–30 g of ethanol per day and advise alcohol-free days. The WHO classifies
            alcohol as a Group 1 carcinogen — there is no fully &ldquo;safe&rdquo; level of
            consumption, only lower-risk levels.
          </div>
        </Alert>
      </Card>

      <Alert variant="warning" soft>
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="text-sm">
          <strong>Harm reduction:</strong> This tool is for educational and tracking purposes
          only. It does not account for body weight, sex, metabolism, food intake, or
          tolerance — all of which materially affect blood alcohol concentration. Never use
          this calculator to determine whether it is safe to drive. Mixing alcohol with
          benzodiazepines, opioids, or other CNS depressants dramatically increases overdose
          risk.
        </div>
      </Alert>
    </div>
  );
}

// ─── Shots → Grams result panel ─────────────────────────────────────────────

function ShotsToGramsPanel({
  shots,
  setShots,
  result,
}: {
  shots: number;
  setShots: (n: number) => void;
  result: ReturnType<typeof shotsToGrams>;
}) {
  return (
    <div className="space-y-4">
      <div className="form-control space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <GlassWater className="h-4 w-4" /> Number of Shots
        </Label>
        <Input
          type="number"
          min="0"
          step="0.5"
          value={shots}
          onChange={(e) => setShots(parseFloat(e.target.value) || 0)}
          placeholder="How many shots?"
        />
      </div>

      {result && shots > 0 ? (
        <div className="bg-base-200/50 rounded-lg p-5 space-y-4">
          {/* Headline result */}
          <div className="flex items-center justify-center gap-3 text-center flex-wrap">
            <span className="text-lg">{shots} shot{shots === 1 ? '' : 's'}</span>
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            <span className="text-3xl font-bold text-primary">
              {roundTo(result.ethanolGrams, 2)} g
            </span>
          </div>
          <p className="text-center text-xs text-base-content/60">
            of pure ethanol
          </p>

          {/* Detailed breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Total volume" value={`${roundTo(result.totalVolumeMl, 1)} mL`} />
            <Stat label="Ethanol volume" value={`${roundTo(result.ethanolVolumeMl, 1)} mL`} />
            <Stat label="Ethanol mass" value={`${roundTo(result.ethanolOunces, 3)} oz`} />
            <Stat label="Per shot" value={`${roundTo(result.gramsPerShot, 2)} g`} />
          </div>

          {/* Standard drink equivalents */}
          <div className="space-y-2 pt-2 border-t border-base-300">
            <p className="text-xs font-medium text-base-content/60 uppercase tracking-wide">
              Equivalent to
            </p>
            <div className="flex flex-wrap gap-2">
              {STANDARD_DRINKS.map((d) => (
                <Badge key={d.id} variant="outline" className="gap-1">
                  {roundTo(result.standardDrinks[d.id], 2)}× {d.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-base-200/30 rounded-lg p-5 text-center text-base-content/50 text-sm">
          Enter a number of shots to see the ethanol equivalent.
        </div>
      )}
    </div>
  );
}

// ─── Grams → Shots result panel ─────────────────────────────────────────────

function GramsToShotsPanel({
  targetGrams,
  setTargetGrams,
  reverseResult,
  shotVolumeMl,
  abv,
}: {
  targetGrams: number;
  setTargetGrams: (n: number) => void;
  reverseResult: number | null;
  shotVolumeMl: number;
  abv: number;
}) {
  return (
    <div className="space-y-4">
      <div className="form-control space-y-1.5">
        <Label className="flex items-center gap-1.5">
          <Scale className="h-4 w-4" /> Target Ethanol (grams)
        </Label>
        <Input
          type="number"
          min="0"
          step="1"
          value={targetGrams}
          onChange={(e) => setTargetGrams(parseFloat(e.target.value) || 0)}
          placeholder="Target grams of ethanol"
        />
        <p className="text-xs text-base-content/60">
          e.g. 14 g = 1 US standard drink, 8 g = 1 UK unit
        </p>
      </div>

      {reverseResult !== null && targetGrams > 0 ? (
        <div className="bg-base-200/50 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-center gap-3 text-center flex-wrap">
            <span className="text-lg">{roundTo(targetGrams, 2)} g</span>
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            <span className="text-3xl font-bold text-primary">
              {roundTo(reverseResult, 2)} shots
            </span>
          </div>
          <p className="text-center text-xs text-base-content/60">
            at {roundTo(shotVolumeMl, 1)} mL per shot and {abv}% ABV
          </p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat
              label="Per shot"
              value={`${roundTo(shotVolumeMl * (abv / 100) * ETHANOL_DENSITY_G_PER_ML, 2)} g`}
            />
            <Stat
              label="Total volume"
              value={`${roundTo(reverseResult * shotVolumeMl, 1)} mL`}
            />
          </div>
        </div>
      ) : (
        <div className="bg-base-200/30 rounded-lg p-5 text-center text-base-content/50 text-sm">
          Enter a target mass of ethanol to see how many shots it equals.
        </div>
      )}
    </div>
  );
}

// ─── Small stat sub-component ───────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-base-100 rounded-lg p-3 border border-base-300">
      <div className="text-xs text-base-content/60 uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-base-content mt-0.5">{value}</div>
    </div>
  );
}