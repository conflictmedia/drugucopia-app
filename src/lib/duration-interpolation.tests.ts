import { describe, expect, it } from 'vitest'
import { getDurationForRoute } from './duration-interpolation'
import type { Substance } from '@/lib/substances/index'

const baseSubstance = {
  id: 'custom-test',
  name: 'Custom Test',
  commonNames: [],
  categories: ['other'],
  class: 'Personal',
  description: 'Test custom substance',
  effects: { positive: [], neutral: [], negative: [] },
  interactions: { dangerous: [], unsafe: [], uncertain: [], crossTolerances: [] },
  harmReduction: [],
  legality: 'unknown',
  chemistry: { formula: '', molecularWeight: '', class: 'Personal' },
  history: null,
  afterEffects: '',
  riskLevel: 'none',
} satisfies Omit<Substance, 'routeData'>

const fullDuration = {
  onset: '10-20 minutes',
  comeup: '20-30 minutes',
  peak: '1-2 hours',
  offset: '30-60 minutes',
  total: '3-4 hours',
  afterglow: '1-2 hours',
}

describe('duration interpolation', () => {
  it('does not mark custom duration data as estimated when route names are aliases', () => {
    const substance: Substance = {
      ...baseSubstance,
      routeData: {
        insufflation: {
          dosage: { threshold: '', light: '', common: '', strong: '', heavy: '' },
          duration: fullDuration,
        },
      },
    }

    const duration = getDurationForRoute(substance, 'insufflated')

    expect(duration).toMatchObject(fullDuration)
    expect(duration?.isEstimated).toBe(false)
  })

  it('ignores empty exact-route duration objects instead of treating them as usable data', () => {
    const substance: Substance = {
      ...baseSubstance,
      routeData: {
        oral: {
          dosage: { threshold: '1 mg', light: '', common: '', strong: '', heavy: '' },
          duration: { onset: '', comeup: '', peak: '', offset: '', total: '', afterglow: '' },
        },
      },
    }

    expect(getDurationForRoute(substance, 'oral')).toBeNull()
  })
})

