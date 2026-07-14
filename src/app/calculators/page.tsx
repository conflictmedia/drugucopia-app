'use client';

import Link from 'next/link';
import { Calculator, Pill, Brain, Leaf } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const calculators = [
  {
    href: '/calculators/benzo-equivalence',
    name: 'Benzodiazepine Equivalence',
    description: 'Convert doses between benzodiazepines using standard equivalence ratios',
    icon: Pill
  },
  {
    href: '/calculators/dxm',
    name: 'DXM Calculator',
    description: 'Calculate DXM dosage by weight and plateau',
    icon: Brain
  },
  {
    href: '/calculators/kratom',
    name: 'Kratom Calculator',
    description: 'Estimate kratom dosage by strain and tolerance',
    icon: Leaf
  },
];

export default function CalculatorsPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Calculators</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {calculators.map(calc => (
          <Card key={calc.href} className="p-6 hover:shadow-lg transition-shadow">
            <calc.icon className="h-10 w-10 text-primary mb-3" />
            <h3 className="text-lg font-semibold mb-2">{calc.name}</h3>
            <p className="text-base-content/70 text-sm mb-4">{calc.description}</p>
            <Link href={calc.href}>
              <Button intent="primary" className="w-full">Open Calculator</Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
