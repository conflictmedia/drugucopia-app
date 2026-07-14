'use client';

import { useState, useEffect } from 'react';
import { useCustomSubstanceStore, type CustomSubstance } from '@/store/custom-substance-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash, Edit, X, PlusCircle } from 'lucide-react';

const CATEGORIES = ['Research Chemical', 'Personal', 'Experimental'] as const;
const ROUTES = ['oral', 'insufflation', 'inhalation', 'sublingual', 'rectal', 'intramuscular', 'intravenous', 'smoked', 'vaped'] as const;

const DEFAULT_ROUTE_DATA = {
  dosage: {
    threshold: '',
    light: '',
    common: '',
    strong: '',
    heavy: '',
  },
  duration: {
    onset: '',
    comeup: '',
    peak: '',
    offset: '',
    total: '',
    afterglow: '',
  },
  notes: '',
};

export default function CustomSubstancesPage() {
  const { substances, loaded, addSubstance, updateSubstance, deleteSubstance, initialize } =
    useCustomSubstanceStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [routeData, setRouteData] = useState<Record<string, typeof DEFAULT_ROUTE_DATA & { notes?: string }>>({});

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!loaded) return <div className="flex items-center justify-center py-12"><div className="loading loading-spinner loading-lg text-primary" /></div>;

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory(CATEGORIES[0]);
    setRouteData({});
    setEditingId(null);
    setShowForm(false);
  };

  const addRoute = (route: string) => {
    setRouteData(prev => ({
      ...prev,
      [route]: { ...DEFAULT_ROUTE_DATA },
    }));
  };

  const removeRoute = (route: string) => {
    setRouteData(prev => {
      const next = { ...prev };
      delete next[route];
      return next;
    });
  };

  const updateRouteDosage = (route: string, field: keyof typeof DEFAULT_ROUTE_DATA.dosage, value: string) => {
    setRouteData(prev => ({
      ...prev,
      [route]: {
        ...prev[route],
        dosage: { ...prev[route]?.dosage, [field]: value },
      },
    }));
  };

  const updateRouteDuration = (route: string, field: keyof typeof DEFAULT_ROUTE_DATA.duration, value: string) => {
    setRouteData(prev => ({
      ...prev,
      [route]: {
        ...prev[route],
        duration: { ...prev[route]?.duration, [field]: value },
      },
    }));
  };

  const updateRouteNotes = (route: string, value: string) => {
    setRouteData(prev => ({
      ...prev,
      [route]: {
        ...prev[route],
        notes: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = new Date().toISOString();
    const cleanRouteData: Record<string, typeof DEFAULT_ROUTE_DATA> = {};
    Object.entries(routeData).forEach(([route, data]) => {
      const hasDosage = Object.values(data.dosage).some(v => v.trim());
      const hasDuration = Object.values(data.duration).some(v => v.trim());
      if (hasDosage || hasDuration || data.notes?.trim()) {
        cleanRouteData[route] = data;
      }
    });

    if (editingId) {
      updateSubstance(editingId, {
        name: name.trim(),
        description: description.trim(),
        category,
        routeData: Object.keys(cleanRouteData).length > 0 ? cleanRouteData : undefined,
        updatedAt: now,
      });
      setEditingId(null);
    } else {
      const sub: CustomSubstance = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description.trim(),
        category,
        routeData: Object.keys(cleanRouteData).length > 0 ? cleanRouteData : undefined,
        customData: {},
        createdAt: now,
        updatedAt: now,
      };
      addSubstance(sub);
    }
    resetForm();
  };

  const startEdit = (sub: CustomSubstance) => {
    setName(sub.name);
    setDescription(sub.description);
    setCategory(sub.category);
    const routeDataFromStore: Record<string, typeof DEFAULT_ROUTE_DATA & { notes?: string }> = {};
    if (sub.routeData) {
      Object.entries(sub.routeData).forEach(([route, data]) => {
        routeDataFromStore[route] = {
          dosage: data.dosage,
          duration: data.duration,
          notes: data.notes || '',
        };
      });
    }
    setRouteData(routeDataFromStore);
    setEditingId(sub.id);
    setShowForm(true);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Custom Substances</h1>
          <p className="text-base-content/70 mt-1">
            Manage your personal substance definitions with dose ranges and durations.
          </p>
        </div>
        <Button intent="primary" iconOnly={false} onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Substance
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Edit Substance' : 'New Substance'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Substance name"
              />
            </div>
            <div className="form-control">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select select-bordered"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea textarea-bordered"
                placeholder="Optional notes or description"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Route-Specific Dose Ranges & Durations</h3>
              <p className="text-sm text-base-content/60 mb-4">
                Add routes to define dosage thresholds and duration timelines for each administration method.
              </p>

              {Object.entries(routeData).map(([route, data]) => (
                <Card key={route} className="p-4 mb-4 bg-base-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium capitalize">{route}</h4>
                    <Button
                      intent="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => removeRoute(route)}
                      variant="ghost"
                    >
                      <X className="w-4 h-4 text-error" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label className="block mb-2 font-semibold text-sm">Dosage ({'mg'})</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['threshold', 'light', 'common', 'strong', 'heavy'] as const).map((field) => (
                          <div key={field} className="form-control">
                            <Label htmlFor={`dosage-${route}-${field}`} className="text-xs mb-1">
                              {field.charAt(0).toUpperCase() + field.slice(1)}
                            </Label>
                            <Input
                              id={`dosage-${route}-${field}`}
                              type="text"
                              value={data.dosage[field]}
                              onChange={(e) => updateRouteDosage(route, field, e.target.value)}
                              placeholder={field === 'threshold' ? 'e.g. 5' : ''}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="block mb-2 font-semibold text-sm">Duration</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['onset', 'comeup', 'peak', 'offset', 'total', 'afterglow'] as const).map((field) => (
                          <div key={field} className="form-control">
                            <Label htmlFor={`duration-${route}-${field}`} className="text-xs mb-1">
                              {field.charAt(0).toUpperCase() + field.slice(1)}
                            </Label>
                            <Input
                              id={`duration-${route}-${field}`}
                              type="text"
                              value={data.duration[field]}
                              onChange={(e) => updateRouteDuration(route, field, e.target.value)}
                              placeholder={field === 'total' ? 'e.g. 4-6h' : field === 'onset' ? 'e.g. 15-30m' : ''}
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="form-control">
                    <Label htmlFor={`notes-${route}`} className="text-xs mb-1">Notes</Label>
                    <Input
                      id={`notes-${route}`}
                      type="text"
                      value={data.notes}
                      onChange={(e) => updateRouteNotes(route, e.target.value)}
                      placeholder="Optional notes for this route"
                      className="text-sm"
                    />
                  </div>
                </Card>
              ))}

              {Object.keys(routeData).length === 0 && (
                <p className="text-center text-base-content/50 py-4">No routes added yet. Click a button below to add one.</p>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                {ROUTES.filter(r => !routeData[r]).map((route) => (
                  <Button
                    key={route}
                    type="button"
                    intent="outline"
                    size="sm"
                    onClick={() => addRoute(route)}
                    className="gap-1"
                  >
                    <PlusCircle className="w-3 h-3" />
                    Add {route.charAt(0).toUpperCase() + route.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button intent="primary" type="submit">
                {editingId ? 'Save Changes' : 'Add Substance'}
              </Button>
              <Button intent="ghost" type="button" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {substances.length === 0 ? (
          <p className="text-center text-base-content/60 py-12">
            No custom substances yet. Add one above!
          </p>
        ) : (
          substances.map((sub) => (
            <Card key={sub.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold truncate">{sub.name}</h3>
                    <Badge variant="default">{sub.category}</Badge>
                  </div>
                  {sub.description && (
                    <p className="text-base-content/70 text-sm line-clamp-2">
                      {sub.description}
                    </p>
                  )}
                  {sub.routeData && Object.keys(sub.routeData).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(sub.routeData).map(([route, data]) => (
                        <Badge key={route} variant="outline" className="text-xs">
                          {route.charAt(0).toUpperCase() + route.slice(1)}: {data.dosage.common || data.dosage.light || '—'} mg
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    intent="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => startEdit(sub)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    intent="danger"
                    size="sm"
                    iconOnly
                    onClick={() => deleteSubstance(sub.id)}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}