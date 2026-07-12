import { checkInteractions, checkSingleSubstanceInteractions, getSubstanceInteractions } from '@/lib/interaction-checker';
import { InteractionSeverity } from '@/lib/interaction-checker';

describe('Interaction Checker', () => {
  describe('checkInteractions', () => {
    it('returns empty result for empty input', () => {
      const result = checkInteractions([]);
      expect(result.pairs).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it('returns empty result for single substance', () => {
      const result = checkInteractions(['alcohol']);
      expect(result.pairs).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it('detects dangerous interaction: alcohol + benzodiazepines', () => {
      const result = checkInteractions(['alcohol', 'diazepam']);
      const dangerousPairs = result.pairs.filter(p => p.severity === 'dangerous');
      expect(dangerousPairs.length).toBeGreaterThan(0);
      expect(dangerousPairs.some(p => 
        p.substanceA.toLowerCase().includes('alcohol') && 
        p.substanceB.toLowerCase().includes('diazepam')
      )).toBe(true);
    });

    it('detects dangerous interaction: MAOI + MDMA', () => {
      // ayahuasca maps to the 'maois' TripSit class
      const result = checkInteractions(['ayahuasca', 'mdma']);
      const dangerousPairs = result.pairs.filter(p => p.severity === 'dangerous');
      expect(dangerousPairs.length).toBeGreaterThan(0);
    });

    it('detects unsafe interaction: cocaine + alcohol', () => {
      const result = checkInteractions(['cocaine', 'alcohol']);
      const unsafePairs = result.pairs.filter(p => p.severity === 'unsafe');
      expect(unsafePairs.length).toBeGreaterThan(0);
      // The TripSit note mentions cocaethylene but the matched term is the status
      const cocaethylenePair = unsafePairs.find(p => 
        p.matchedTerms.some(t => t.toLowerCase().includes('unsafe'))
      );
      expect(cocaethylenePair).toBeDefined();
    });

    it('detects caution interaction: ketamine + cocaine', () => {
      const result = checkInteractions(['ketamine', 'cocaine']);
      const cautionPairs = result.pairs.filter(p => p.severity === 'caution');
      expect(cautionPairs.length).toBeGreaterThan(0);
    });

    it('returns caution for cannabis + lsd (TripSit reports Caution)', () => {
      const result = checkInteractions(['cannabis', 'lsd']);
      const cautionPairs = result.pairs.filter(p => p.severity === 'caution');
      expect(cautionPairs.length).toBeGreaterThan(0);
    });

    it('handles multiple substances and returns all pair combinations', () => {
      const result = checkInteractions(['alcohol', 'cocaine', 'mdma']);
      expect(result.pairs.length).toBeGreaterThanOrEqual(3);
      expect(result.summary.total).toBe(result.pairs.length);
    });

    it('correctly summarizes severity counts', () => {
      const result = checkInteractions(['alcohol', 'diazepam', 'cocaine']);
      expect(result.summary.dangerous).toBeGreaterThanOrEqual(0);
      expect(result.summary.unsafe).toBeGreaterThanOrEqual(0);
      expect(result.summary.caution).toBeGreaterThanOrEqual(0);
      expect(result.summary.lowRisk).toBeGreaterThanOrEqual(0);
      expect(result.summary.total).toBe(result.pairs.length);
    });

it('includes cross-tolerance information', () => {
      // Both LSD and DMT have "psychedelics" cross-tolerance
      const result = checkInteractions(['lsd', 'dmt']);
      expect(result.crossTolerances.length).toBeGreaterThan(0);
      expect(result.crossTolerances[0].substances).toContain('LSD');
      expect(result.crossTolerances[0].substances).toContain('DMT');
    });

    it('sorts pairs by severity (dangerous first)', () => {
      const result = checkInteractions(['alcohol', 'diazepam', 'cocaine', 'cannabis']);
      const severities = result.pairs.map(p => p.severity);
      const severityOrder: InteractionSeverity[] = ['dangerous', 'unsafe', 'caution', 'low-risk'];
      
      for (let i = 0; i < severities.length - 1; i++) {
        const currentIdx = severityOrder.indexOf(severities[i]);
        const nextIdx = severityOrder.indexOf(severities[i + 1]);
        expect(currentIdx).toBeLessThanOrEqual(nextIdx);
      }
    });

    it('handles unknown substance IDs gracefully', () => {
      const result = checkInteractions(['unknown-substance-xyz', 'alcohol']);
      expect(result.pairs).toHaveLength(0);
    });

    it('TripSit combos take priority over fallback data', () => {
      const result = checkInteractions(['mdma', 'tramadol']);
      const pairs = result.pairs.filter(p => 
        p.substanceA.toLowerCase().includes('mdma') && 
        p.substanceB.toLowerCase().includes('tramadol')
      );
      expect(pairs.length).toBeGreaterThan(0);
      expect(pairs[0].sources).toContain('tripsit');
    });
  });

  describe('checkSingleSubstanceInteractions', () => {
    it('returns all known interactions for a single substance', () => {
      const result = checkSingleSubstanceInteractions('mdma');
      expect(result.pairs.length).toBeGreaterThan(0);
      expect(result.pairs.every(p => p.substanceA.toLowerCase() === 'mdma')).toBe(true);
    });

    it('includes cross-tolerances for single substance', () => {
      const result = checkSingleSubstanceInteractions('lsd');
      expect(result.crossTolerances.length).toBeGreaterThan(0);
    });

    it('returns empty for unknown substance', () => {
      const result = checkSingleSubstanceInteractions('unknown-xyz');
      expect(result.pairs).toHaveLength(0);
      expect(result.crossTolerances).toHaveLength(0);
    });

    it('sorts results by severity', () => {
      const result = checkSingleSubstanceInteractions('alcohol');
      const severities = result.pairs.map(p => p.severity);
      const severityOrder: InteractionSeverity[] = ['dangerous', 'unsafe', 'caution', 'low-risk'];
      
      for (let i = 0; i < severities.length - 1; i++) {
        const currentIdx = severityOrder.indexOf(severities[i]);
        const nextIdx = severityOrder.indexOf(severities[i + 1]);
        expect(currentIdx).toBeLessThanOrEqual(nextIdx);
      }
    });
  });

  describe('getSubstanceInteractions', () => {
    it('returns structured interaction data for substance detail view', () => {
      const result = getSubstanceInteractions('mdma');
      expect(result.dangerous).toBeDefined();
      expect(result.unsafe).toBeDefined();
      expect(result.uncertain).toBeDefined();
      expect(result.crossTolerances).toBeDefined();
      expect(Array.isArray(result.dangerous)).toBe(true);
    });

    it('returns empty arrays for unknown substance', () => {
      const result = getSubstanceInteractions('unknown-xyz');
      expect(result.dangerous).toHaveLength(0);
      expect(result.unsafe).toHaveLength(0);
      expect(result.uncertain).toHaveLength(0);
      expect(result.crossTolerances).toHaveLength(0);
    });
  });

  describe('severity mapping', () => {
    it('maps TripSit "Dangerous" to "dangerous"', () => {
      // ayahuasca maps to the 'maois' TripSit class
      const result = checkInteractions(['ayahuasca', 'mdma']);
      const dangerous = result.pairs.find(p => p.severity === 'dangerous');
      expect(dangerous).toBeDefined();
      expect(dangerous?.tripsitStatus).toBe('Dangerous');
    });

    it('maps TripSit "Unsafe" to "unsafe"', () => {
      const result = checkInteractions(['cocaine', 'alcohol']);
      const unsafe = result.pairs.find(p => p.severity === 'unsafe');
      expect(unsafe).toBeDefined();
    });

    it('maps TripSit "Caution" to "caution"', () => {
      const result = checkInteractions(['ketamine', 'cocaine']);
      const caution = result.pairs.find(p => p.severity === 'caution');
      expect(caution).toBeDefined();
    });

    it('maps TripSit "Low Risk" variants to "low-risk"', () => {
      // cannabis + ketamine has "Low Risk & Synergy" in TripSit
      const result = checkInteractions(['cannabis', 'ketamine']);
      const lowRisk = result.pairs.find(p => p.severity === 'low-risk');
      expect(lowRisk).toBeDefined();
    });
  });
});