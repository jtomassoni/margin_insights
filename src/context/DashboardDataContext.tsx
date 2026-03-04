'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SalesRecord } from '@/insight-engine/models/SalesRecord';
import type { Ingredient, IngredientKind } from '@/insight-engine/models/Ingredient';
import type { Recipe } from '@/insight-engine/models/Recipe';
import { demoMarginGoal } from '@/data/demoData';

const SAVE_DEBOUNCE_MS = 1500;
import { costPerServing } from '@/insight-engine/services/costCalculator';
import { computeMargins, type ItemMarginRow } from '@/insight-engine/services/marginEngine';
import { buildProfitLeakReport } from '@/insight-engine/reports/profitLeakReport';
import { runQuadrantAnalysis } from '@/insight-engine/services/quadrantAnalysis';

const uid = () => Math.random().toString(36).slice(2, 11);

export interface DashboardDataContextValue {
  salesRecords: SalesRecord[];
  setSalesRecords: React.Dispatch<React.SetStateAction<SalesRecord[]>>;
  ingredients: Ingredient[];
  recipes: Recipe[];
  marginGoal: number;
  setMarginGoal: React.Dispatch<React.SetStateAction<number>>;
  menuPrices: Record<string, number>;
  setMenuPrices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  menuMarginGoal: Record<string, number>;
  setMenuMarginGoal: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  menuCategories: string[];
  setMenuCategories: React.Dispatch<React.SetStateAction<string[]>>;
  menuItemCategories: Record<string, string>;
  setMenuItemCategories: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  menuItemIsDrink: Record<string, boolean>;
  setMenuItemIsDrink: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  menuItemPourOz: Record<string, number>;
  setMenuItemPourOz: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  menuItemBottleOz: Record<string, number>;
  setMenuItemBottleOz: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  editingNum: Record<string, string>;
  setEditingNum: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  ingredientFilter: string;
  setIngredientFilter: React.Dispatch<React.SetStateAction<string>>;
  selectedRecipeName: string;
  setSelectedRecipeName: React.Dispatch<React.SetStateAction<string>>;
  sortKey: keyof ItemMarginRow;
  setSortKey: React.Dispatch<React.SetStateAction<keyof ItemMarginRow>>;
  sortDir: 'asc' | 'desc';
  setSortDir: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  activeTab: 'margins' | 'leaks' | 'pricing' | 'quadrant' | 'liquor' | 'snapshots' | 'manage' | 'insights';
  setActiveTab: React.Dispatch<React.SetStateAction<'margins' | 'leaks' | 'pricing' | 'quadrant' | 'liquor' | 'snapshots' | 'manage' | 'insights'>>;
  addIngredient: (kind?: IngredientKind) => void;
  createIngredient: (name: string, unitType: Ingredient['unit_type'], costPerUnit: number, kind?: IngredientKind, bottleOz?: number) => string;
  updateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  removeIngredient: (id: string) => void;
  getOrCreateRecipe: (menuItemName: string) => Recipe;
  setRecipe: (menuItemName: string, recipe: Recipe) => void;
  addRecipeLine: (menuItemName: string, ingredientId: string, quantity: number, displayUnit?: import('@/insight-engine/models/Ingredient').UnitType) => void;
  removeRecipeLine: (menuItemName: string, ingredientId: string) => void;
  addMenuItem: (name: string) => void;
  removeMenuItem: (name: string) => void;
  renameMenuItem: (oldName: string, newName: string) => void;
  findOrCreateIngredient: (name: string, unitType: Ingredient['unit_type'], costPerUnit: number) => string;
  toggleSort: (key: keyof ItemMarginRow) => void;
  hasAnyIngredients: boolean;
  hasAnyMenuItems: boolean;
  baseIngredients: Ingredient[];
  filteredIngredients: Ingredient[];
  uniqueItemNames: string[];
  itemCosts: Map<string, number>;
  marginRows: ItemMarginRow[];
  marginRowsWithPrices: ItemMarginRow[];
  sortedRows: ItemMarginRow[];
  leakReport: ReturnType<typeof buildProfitLeakReport>;
  quadrantItems: ReturnType<typeof runQuadrantAnalysis>;
  isLoading: boolean;
  saveError: string | null;
}

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function useDashboardData() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) throw new Error('useDashboardData must be used within DashboardDataProvider');
  return ctx;
}

/** Optional version — returns null when not inside DashboardDataProvider (e.g. demo-dashboard) */
export function useDashboardDataOptional() {
  return useContext(DashboardDataContext);
}

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sortKey, setSortKey] = useState<keyof ItemMarginRow>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'margins' | 'leaks' | 'pricing' | 'quadrant' | 'liquor' | 'snapshots' | 'manage' | 'insights'>('leaks');
  const [marginGoal, setMarginGoal] = useState(demoMarginGoal);
  const [menuPrices, setMenuPrices] = useState<Record<string, number>>({});
  const [menuMarginGoal, setMenuMarginGoal] = useState<Record<string, number>>({});
  const [menuCategories, setMenuCategories] = useState<string[]>([]);
  const [menuItemCategories, setMenuItemCategories] = useState<Record<string, string>>({});
  const [menuItemIsDrink, setMenuItemIsDrink] = useState<Record<string, boolean>>({});
  const [menuItemPourOz, setMenuItemPourOz] = useState<Record<string, number>>({});
  const [menuItemBottleOz, setMenuItemBottleOz] = useState<Record<string, number>>({});
  const [editingNum, setEditingNum] = useState<Record<string, string>>({});
  const [ingredientFilter, setIngredientFilter] = useState('');
  const [selectedRecipeName, setSelectedRecipeName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const skipNextSaveRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) {
          if (res.status === 503) {
            setIsLoading(false);
            return;
          }
          throw new Error(await res.text());
        }
        const data = await res.json();
        if (cancelled) return;
        setIngredients(data.ingredients ?? []);
        setRecipes(data.recipes ?? []);
        setMenuPrices(data.menuPrices ?? {});
        setMenuMarginGoal(data.menuMarginGoal ?? {});
        setMenuCategories(data.menuCategories ?? []);
        setMenuItemCategories(data.menuItemCategories ?? {});
        setMenuItemIsDrink(data.menuItemIsDrink ?? {});
        setMenuItemPourOz(data.menuItemPourOz ?? {});
        setMenuItemBottleOz(data.menuItemBottleOz ?? {});
        setSalesRecords(data.salesRecords ?? []);
        setMarginGoal(data.marginGoal ?? demoMarginGoal);
        if ((data.recipes ?? []).length > 0) {
          setSelectedRecipeName(data.recipes[0].menu_item_name);
        }
      } catch (err) {
        if (!cancelled) setSaveError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSaveError(null);
        const res = await fetch('/api/dashboard', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients,
            recipes,
            menuPrices,
            menuMarginGoal,
            salesRecords,
            marginGoal,
            menuCategories,
            menuItemCategories,
            menuItemIsDrink,
            menuItemPourOz,
            menuItemBottleOz,
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          if (res.status !== 503) setSaveError(text || 'Failed to save');
        }
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save');
      }
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isLoading, ingredients, recipes, menuPrices, menuMarginGoal, salesRecords, marginGoal, menuCategories, menuItemCategories, menuItemIsDrink, menuItemPourOz, menuItemBottleOz]);

  const baseIngredients = useMemo(
    () => ingredients.filter((i) => (i.kind ?? 'ingredient') === 'ingredient'),
    [ingredients]
  );

  const uniqueItemNames = useMemo(() => {
    const fromSales = new Set(salesRecords.map((r) => r.item_name.trim()).filter(Boolean));
    const fromRecipes = new Set(recipes.map((r) => r.menu_item_name.trim()).filter(Boolean));
    const combined = new Set<string>();
    fromSales.forEach((n) => combined.add(n));
    fromRecipes.forEach((n) => combined.add(n));
    return Array.from(combined).sort();
  }, [salesRecords, recipes]);

  useEffect(() => {
    if (uniqueItemNames.length === 0) {
      setSelectedRecipeName('');
      return;
    }
    if (!selectedRecipeName || !uniqueItemNames.includes(selectedRecipeName)) {
      setSelectedRecipeName(uniqueItemNames[0]);
    }
  }, [uniqueItemNames.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredIngredients = useMemo(() => {
    const q = ingredientFilter.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, ingredientFilter]);

  const itemCosts = useMemo(() => {
    const map = new Map<string, number>();
    for (const recipe of recipes) {
      const cost = costPerServing(recipe, ingredients);
      map.set(recipe.menu_item_name, cost);
    }
    return map;
  }, [recipes, ingredients]);

  const marginRows = useMemo(
    () => computeMargins(salesRecords, itemCosts, menuPrices),
    [salesRecords, itemCosts, menuPrices]
  );

  const marginRowsWithPrices = useMemo(
    () =>
      marginRows.map((r) => ({
        ...r,
        price: menuPrices[r.item_name] ?? r.price,
      })),
    [marginRows, menuPrices]
  );

  const sortedRows = useMemo(() => {
    const rows = [...marginRowsWithPrices];
    rows.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number')
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      if (typeof aVal === 'string' && typeof bVal === 'string')
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return 0;
    });
    return rows;
  }, [marginRowsWithPrices, sortKey, sortDir]);

  const leakReport = useMemo(
    () => buildProfitLeakReport(marginRowsWithPrices, marginGoal, menuMarginGoal),
    [marginRowsWithPrices, marginGoal, menuMarginGoal]
  );

  const quadrantItems = useMemo(
    () => runQuadrantAnalysis(marginRowsWithPrices),
    [marginRowsWithPrices]
  );

  const addIngredient = useCallback((kind: IngredientKind = 'ingredient') => {
    setIngredients((prev) => [
      ...prev,
      {
        id: uid(),
        name: '',
        unit_type: kind === 'maintenance' ? 'each' : 'oz',
        cost_per_unit: 0,
        kind,
      },
    ]);
  }, []);

  const createIngredient = useCallback(
    (
      name: string,
      unitType: Ingredient['unit_type'],
      costPerUnit: number,
      kind: IngredientKind = 'ingredient',
      bottleOz?: number
    ) => {
      const id = uid();
      setIngredients((prev) => [
        ...prev,
        {
          id,
          name: name.trim(),
          unit_type: unitType,
          cost_per_unit: Math.max(0, costPerUnit),
          kind,
          bottle_oz: kind === 'liquor' ? (bottleOz ?? 25.4) : undefined,
        },
      ]);
      return id;
    },
    []
  );

  const updateIngredient = useCallback((id: string, patch: Partial<Ingredient>) => {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const removeIngredient = useCallback((id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    setRecipes((prev) =>
      prev.map((r) => ({
        ...r,
        lines: r.lines.filter((l) => l.ingredient_id !== id),
      }))
    );
  }, []);

  const getOrCreateRecipe = useCallback(
    (menuItemName: string): Recipe => {
      const existing = recipes.find((r) => r.menu_item_name === menuItemName);
      if (existing) return existing;
      return { menu_item_name: menuItemName, lines: [] };
    },
    [recipes]
  );

  const setRecipe = useCallback((menuItemName: string, recipe: Recipe) => {
    setRecipes((prev) => {
      const rest = prev.filter((r) => r.menu_item_name !== menuItemName);
      return [...rest, recipe];
    });
  }, []);

  const addMenuItem = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = recipes.some((r) => r.menu_item_name === trimmed);
    if (exists) return;
    setRecipes((prev) => [...prev, { menu_item_name: trimmed, lines: [] }]);
    setSelectedRecipeName(trimmed);
  }, [recipes]);

  const removeMenuItem = useCallback((name: string) => {
    setRecipes((prev) => prev.filter((r) => r.menu_item_name !== name));
    setMenuPrices((p) => {
      const next = { ...p };
      delete next[name];
      return next;
    });
    setMenuMarginGoal((m) => {
      const next = { ...m };
      delete next[name];
      return next;
    });
    setMenuItemCategories((m) => {
      const next = { ...m };
      delete next[name];
      return next;
    });
    setSalesRecords((prev) => prev.filter((r) => r.item_name !== name));
    if (selectedRecipeName === name) {
      const remaining = recipes.filter((r) => r.menu_item_name !== name);
      setSelectedRecipeName(remaining[0]?.menu_item_name ?? '');
    }
  }, [selectedRecipeName, recipes]);

  const renameMenuItem = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const exists = recipes.some((r) => r.menu_item_name === trimmed);
    if (exists) return;
    setRecipes((prev) =>
      prev.map((r) =>
        r.menu_item_name === oldName ? { ...r, menu_item_name: trimmed } : r
      )
    );
    setMenuPrices((p) => {
      const next = { ...p };
      if (oldName in next) {
        next[trimmed] = next[oldName];
        delete next[oldName];
      }
      return next;
    });
    setMenuMarginGoal((m) => {
      const next = { ...m };
      if (oldName in next) {
        next[trimmed] = next[oldName];
        delete next[oldName];
      }
      return next;
    });
    setMenuItemCategories((m) => {
      const next = { ...m };
      if (oldName in next) {
        next[trimmed] = next[oldName];
        delete next[oldName];
      }
      return next;
    });
    setSalesRecords((prev) =>
      prev.map((r) => (r.item_name === oldName ? { ...r, item_name: trimmed } : r))
    );
    if (selectedRecipeName === oldName) setSelectedRecipeName(trimmed);
  }, [selectedRecipeName]);

  const findOrCreateIngredient = useCallback(
    (name: string, unitType: Ingredient['unit_type'], costPerUnit: number): string => {
      const trimmed = name.trim().toLowerCase();
      const existing = ingredients.find((i) => i.name.trim().toLowerCase() === trimmed);
      if (existing) return existing.id;
      const newIng: Ingredient = {
        id: uid(),
        name: name.trim(),
        unit_type: unitType,
        cost_per_unit: costPerUnit,
        kind: 'ingredient',
      };
      setIngredients((prev) => [...prev, newIng]);
      return newIng.id;
    },
    [ingredients]
  );

  const addRecipeLine = useCallback(
    (
      menuItemName: string,
      ingredientId: string,
      quantity: number,
      displayUnit?: Ingredient['unit_type']
    ) => {
      const recipe = getOrCreateRecipe(menuItemName);
      const existing = recipe.lines.find((l) => l.ingredient_id === ingredientId);
      const line = { ingredient_id: ingredientId, quantity, ...(displayUnit && { display_unit: displayUnit }) };
      const newLines = existing
        ? recipe.lines.map((l) => (l.ingredient_id === ingredientId ? { ...l, ...line } : l))
        : [...recipe.lines, line];
      setRecipe(menuItemName, { ...recipe, lines: newLines });
    },
    [getOrCreateRecipe, setRecipe]
  );

  const removeRecipeLine = useCallback(
    (menuItemName: string, ingredientId: string) => {
      const recipe = getOrCreateRecipe(menuItemName);
      setRecipe(menuItemName, {
        ...recipe,
        lines: recipe.lines.filter((l) => l.ingredient_id !== ingredientId),
      });
    },
    [getOrCreateRecipe, setRecipe]
  );

  const toggleSort = useCallback((key: keyof ItemMarginRow) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      return key;
    });
  }, []);

  const hasAnyIngredients = ingredients.length > 0;
  const hasAnyMenuItems = recipes.length > 0;

  const value = useMemo<DashboardDataContextValue>(
    () => ({
      salesRecords,
      setSalesRecords,
      ingredients,
      recipes,
      marginGoal,
      setMarginGoal,
      menuPrices,
      setMenuPrices,
      menuMarginGoal,
      setMenuMarginGoal,
      menuCategories,
      setMenuCategories,
      menuItemCategories,
      setMenuItemCategories,
      menuItemIsDrink,
      setMenuItemIsDrink,
      menuItemPourOz,
      setMenuItemPourOz,
      menuItemBottleOz,
      setMenuItemBottleOz,
      editingNum,
      setEditingNum,
      ingredientFilter,
      setIngredientFilter,
      selectedRecipeName,
      setSelectedRecipeName,
      sortKey,
      setSortKey,
      sortDir,
      setSortDir,
      activeTab,
      setActiveTab,
      addIngredient,
      createIngredient,
      updateIngredient,
      removeIngredient,
      getOrCreateRecipe,
      setRecipe,
      addRecipeLine,
      removeRecipeLine,
      addMenuItem,
      removeMenuItem,
      renameMenuItem,
      findOrCreateIngredient,
      toggleSort,
      hasAnyIngredients,
      hasAnyMenuItems,
      baseIngredients,
      filteredIngredients,
      uniqueItemNames,
      itemCosts,
      marginRows,
      marginRowsWithPrices,
      sortedRows,
      leakReport,
      quadrantItems,
      isLoading,
      saveError,
    }),
    [
      salesRecords,
      ingredients,
      recipes,
      marginGoal,
      menuPrices,
      menuMarginGoal,
      menuCategories,
      menuItemCategories,
      menuItemIsDrink,
      menuItemPourOz,
      menuItemBottleOz,
      editingNum,
      ingredientFilter,
      selectedRecipeName,
      sortKey,
      sortDir,
      activeTab,
      addIngredient,
      createIngredient,
      updateIngredient,
      removeIngredient,
      getOrCreateRecipe,
      setRecipe,
      addRecipeLine,
      removeRecipeLine,
      addMenuItem,
      removeMenuItem,
      renameMenuItem,
      findOrCreateIngredient,
      toggleSort,
      hasAnyIngredients,
      hasAnyMenuItems,
      baseIngredients,
      filteredIngredients,
      uniqueItemNames,
      itemCosts,
      marginRows,
      marginRowsWithPrices,
      sortedRows,
      leakReport,
      quadrantItems,
      isLoading,
      saveError,
    ]
  );

  return (
    <DashboardDataContext.Provider value={value}>
      {children}
    </DashboardDataContext.Provider>
  );
}
