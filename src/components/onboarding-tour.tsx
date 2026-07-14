'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HelpCircle, ChevronLeft, ChevronRight, Check, X, Zap, Pill, Shuffle, Activity, Star, Calculator, Shield, Settings, Search } from 'lucide-react'

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Drugucopia',
    content: 'Your personal substance reference, dose logger, and harm reduction toolkit. Let\'s take a quick tour.',
    target: null,
    position: 'center',
  },
  {
    id: 'library',
    title: 'Substance Library',
    content: 'Browse 200+ substances with detailed dosage, duration, effects, and safety info. Use filters to find what you need.',
    target: '[data-tour="library"]',
    position: 'right',
  },
  {
    id: 'search',
    title: 'Command Palette Search',
    content: 'Press ⌘K (Ctrl+K) anywhere to instantly search substances, open calculators, or navigate pages.',
    target: '[data-tour="search"]',
    position: 'bottom',
  },
  {
    id: 'interactions',
    title: 'Interaction Checker',
    content: 'Select multiple substances to check for dangerous interactions. Uses the TripSit database with 840+ documented pairs.',
    target: '[data-tour="interactions"]',
    position: 'left',
  },
  {
    id: 'dose-log',
    title: 'Dose Logger',
    content: 'Log doses with timestamp, amount, route, and notes. Tracks active sessions with intensity timeline and reminders.',
    target: '[data-tour="dose-log"]',
    position: 'left',
  },
  {
    id: 'reminders',
    title: 'Smart Reminders',
    content: 'Set recurring reminders for medications. Auto-starts timers when you log a dose. Browser notifications + sound.',
    target: '[data-tour="reminders"]',
    position: 'left',
  },
  {
    id: 'medications',
    title: 'Medication Profile',
    content: 'Add your prescription medications. Get automatic interaction warnings when checking combinations or logging doses.',
    target: '[data-tour="medications"]',
    position: 'left',
  },
  {
    id: 'calculators',
    title: 'Calculators',
    content: 'DXM plateau calculator, Kratom dosage estimator, and Benzodiazepine equivalence converter for safe dose conversions.',
    target: '[data-tour="calculators"]',
    position: 'left',
  },
  {
    id: 'harm-reduction',
    title: 'Harm Reduction',
    content: 'Evidence-based safety guides: trip sitting, overdose response, testing kits, and substance-specific risk reduction.',
    target: '[data-tour="harm-reduction"]',
    position: 'left',
  },
  {
    id: 'settings',
    title: 'Settings & Sync',
    content: 'Customize theme, enable data sync across devices, manage notifications, and export your data anytime.',
    target: '[data-tour="settings"]',
    position: 'left',
  },
  {
    id: 'complete',
    title: 'You\'re Ready!',
    content: 'Drugucopia works offline as a PWA. Install it to your home screen for festival/offline access. Stay safe!',
    target: null,
    position: 'center',
  },
]

export function OnboardingTour({ isOpen: controlledOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completed, setCompleted] = useState(false)

  const isOpen = controlledOpen ?? internalIsOpen
  const setIsOpen = controlledOpen ? () => {} : setInternalIsOpen

  const closeTour = () => {
    if (controlledOpen) {
      onClose?.()
    } else {
      setInternalIsOpen(false)
    }
  }

  useEffect(() => {
    if (!controlledOpen) {
      const hasSeenTour = localStorage.getItem('drugucopia-tour-complete')
      if (!hasSeenTour) {
        setTimeout(() => setInternalIsOpen(true), 1000)
      }
    }
  }, [controlledOpen])

  const step = TOUR_STEPS[currentStep]
  const isLastStep = currentStep === TOUR_STEPS.length - 1

  const nextStep = () => {
    if (isLastStep) {
      completeTour()
    } else {
      setCurrentStep(s => s + 1)
    }
  }

  const prevStep = () => setCurrentStep(s => Math.max(0, s - 1))

  const completeTour = () => {
    localStorage.setItem('drugucopia-tour-complete', 'true')
    closeTour()
    setCompleted(true)
  }

  const skipTour = () => {
    localStorage.setItem('drugucopia-tour-complete', 'true')
    closeTour()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={skipTour}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-md bg-base-100 rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Progress indicator */}
          <div className="px-6 py-4 border-b border-base-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {TOUR_STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  layout
                  className={`h-2 w-8 rounded transition-colors ${i === currentStep ? 'bg-primary' : i < currentStep ? 'bg-success' : 'bg-base-300'}`}
                />
              ))}
            </div>
            <Button intent="ghost" size="sm" iconOnly onClick={skipTour}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Step content */}
          <div className="p-6 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-2 rounded-full bg-primary/10 text-primary">
                    {(() => {
                      switch (step.id) {
                        case 'welcome': return <HelpCircle className="h-6 w-6" />
                        case 'library': return <Pill className="h-6 w-6" />
                        case 'search': return <Search className="h-6 w-6" />
                        case 'interactions': return <Shuffle className="h-6 w-6" />
                        case 'dose-log': return <Activity className="h-6 w-6" />
                        case 'reminders': return <Zap className="h-6 w-6" />
                        case 'medications': return <Pill className="h-6 w-6" />
                        case 'calculators': return <Calculator className="h-6 w-6" />
                        case 'harm-reduction': return <Shield className="h-6 w-6" />
                        case 'settings': return <Settings className="h-6 w-6" />
                        case 'complete': return <Check className="h-6 w-6" />
                        default: return <HelpCircle className="h-6 w-6" />
                      }
                    })()}
                  </div>
                  <div>
                    <h3 id="tour-title" className="text-xl font-semibold">{step.title}</h3>
                    <p className="text-base-content/70 mt-1">{step.content}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 border-t border-base-300 flex items-center justify-between">
            <Button intent="ghost" onClick={prevStep} disabled={currentStep === 0}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button intent="ghost" size="sm" onClick={skipTour}>
                  Skip Tour
                </Button>
              )}
              <Button intent="primary" onClick={nextStep} className="ml-auto">
                {isLastStep ? (
                  <>Get Started <Check className="w-4 h-4 ml-1" /></>
                ) : (
                  <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Helper component to mark tour targets
export function TourTarget({ id, children }: { id: string; children: React.ReactNode }) {
  return <div data-tour={id}>{children}</div>
}
