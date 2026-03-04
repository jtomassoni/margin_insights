'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import AddItemModal from '@/components/AddItemModal';
import type { Ingredient, IngredientKind } from '@/insight-engine/models/Ingredient';
import { useDashboardData } from '@/context/DashboardDataContext';
import { lineCost, lineDisplay } from '@/insight-engine/services/costCalculator';
import { convertUnit } from '@/insight-engine/utils/unitConversion';

const UNIT_OPTIONS: { value: Ingredient['unit_type']; label: string }[] = [
  { value: 'oz', label: 'oz' },
  { value: 'ml', label: 'ml' },
  { value: 'grams', label: 'g' },
  { value: 'count', label: 'count' },
  { value: 'lb', label: 'lb' },
  { value: 'each', label: 'each' },
];

function SearchableIngredientDropdown({
  ingredients,
  onSelectExisting,
  onAddNew,
  placeholder = 'Search or add ingredient…',
}: {
  ingredients: Ingredient[];
  onSelectExisting: (ing: Ingredient) => void;
  onAddNew: (name: string, unit: Ingredient['unit_type'], cost: number) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? ingredients.filter((i) =>
        i.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : ingredients;
  const exactMatch = ingredients.find(
    (i) => i.name.toLowerCase() === query.trim().toLowerCase()
  );
  const canAddNew = query.trim() && !exactMatch;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewForm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="menu-item-ingredient-search" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setShowNewForm(false);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="menu-item-ingredient-search-input"
        aria-label="Search or add ingredient"
        aria-expanded={open}
        aria-haspopup="listbox"
      />
      {open && (
        <ul
          className="menu-item-ingredient-search-results"
          role="listbox"
        >
          {filtered.slice(0, 8).map((ing) => (
            <li
              key={ing.id}
              role="option"
              className="menu-item-ingredient-search-option"
              onClick={() => {
                onSelectExisting(ing);
                setQuery('');
                setOpen(false);
              }}
            >
              <span className="menu-item-ingredient-search-option-name">
                {ing.name}
              </span>
              <span className="menu-item-ingredient-search-option-meta">
                {ing.unit_type} · ${ing.cost_per_unit.toFixed(2)}/{ing.unit_type}
              </span>
            </li>
          ))}
          {canAddNew && (
            <li
              role="option"
              className="menu-item-ingredient-search-option menu-item-ingredient-search-option--new"
              onClick={() => {
                setShowNewForm(true);
                setOpen(false);
              }}
            >
              + Add &quot;{query.trim()}&quot; as new ingredient
            </li>
          )}
          {filtered.length === 0 && !canAddNew && (
            <li className="menu-item-ingredient-search-empty">
              No ingredients yet. Add one below.
            </li>
          )}
        </ul>
      )}
      {showNewForm && (
        <NewIngredientForm
          initialName={query.trim()}
          onSave={(name, unit, cost) => {
            onAddNew(name, unit, cost);
            setShowNewForm(false);
            setQuery('');
          }}
          onCancel={() => {
            setShowNewForm(false);
          }}
        />
      )}
    </div>
  );
}

function NewIngredientModal({
  kind,
  onSave,
  onClose,
}: {
  kind: IngredientKind;
  onSave: (name: string, unit: Ingredient['unit_type'], cost: number, bottleOz?: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Ingredient['unit_type']>(kind === 'maintenance' ? 'each' : 'oz');
  const [cost, setCost] = useState('');
  const [bottleOz, setBottleOz] = useState('25.4');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const costNum = Math.max(0, parseFloat(cost) || 0);
  const isValid = name.trim().length > 0;

  const handleSubmit = () => {
    if (isValid) {
      const bottle =
        kind === 'liquor'
          ? (() => {
              const b = parseFloat(bottleOz);
              return Number.isFinite(b) && b > 0 ? b : 25.4;
            })()
          : undefined;
      onSave(name.trim(), unit, costNum, bottle);
    }
  };

  return (
    <div
      className="menu-item-add-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-ingredient-modal-title"
    >
      <div
        className="menu-item-add-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="new-ingredient-modal-title" className="menu-item-add-modal-title">
          {kind === 'maintenance' ? 'New maintenance cost' : kind === 'liquor' ? 'New liquor' : 'New ingredient'}
        </h2>
        <p className="menu-item-add-modal-desc">
          {kind === 'maintenance'
            ? 'Add an overhead cost (e.g. dishwasher cycle, waste buffer).'
            : kind === 'liquor'
              ? 'Add a spirit/liquor. Unit cost & bottle size feed liquor variance.'
              : 'Add a food or beverage ingredient. Set name, unit, and cost per unit.'}
        </p>
        <label className="menu-item-add-modal-field">
          <span className="menu-item-add-modal-label">Name</span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder={kind === 'maintenance' ? 'e.g. Dishwasher cycle' : kind === 'liquor' ? 'e.g. Titos Vodka' : 'e.g. Chicken breast'}
            className="menu-item-add-modal-input"
            aria-label="Ingredient name"
          />
        </label>
        <label className="menu-item-add-modal-field">
          <span className="menu-item-add-modal-label">Unit</span>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as Ingredient['unit_type'])}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            className="menu-item-add-modal-input"
            aria-label="Unit type"
          >
            {UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="menu-item-add-modal-field">
          <span className="menu-item-add-modal-label">Cost per unit</span>
          <span className="menu-item-add-modal-price-wrap">
            <span className="menu-item-add-modal-price-prefix">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValid) handleSubmit();
              }}
              placeholder="0.00"
              className="menu-item-add-modal-input"
              aria-label="Cost per unit"
            />
          </span>
        </label>
        {kind === 'liquor' && (
          <label className="menu-item-add-modal-field">
            <span className="menu-item-add-modal-label">Oz per bottle (e.g. 25.4 for 750ml)</span>
            <input
              type="number"
              min={1}
              step={0.1}
              value={bottleOz}
              onChange={(e) => setBottleOz(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValid) handleSubmit();
              }}
              className="menu-item-add-modal-input"
              aria-label="Oz per bottle"
            />
          </label>
        )}
        <div className="menu-item-add-modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            Add
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

type IngredientSortKey = 'name' | 'kind' | 'unit_type' | 'cost_per_unit' | 'bottle_oz';

function ManageIngredientsTable({
  ingredients,
  ingredientFilter,
  setIngredientFilter,
  createIngredient,
  updateIngredient,
  removeIngredient,
  editingNum,
  setEditingNum,
}: {
  ingredients: Ingredient[];
  ingredientFilter: string;
  setIngredientFilter: (v: string) => void;
  createIngredient: (name: string, unitType: Ingredient['unit_type'], costPerUnit: number, kind?: IngredientKind, bottleOz?: number) => string;
  updateIngredient: (id: string, patch: Partial<Ingredient>) => void;
  removeIngredient: (id: string) => void;
  editingNum: Record<string, string>;
  setEditingNum: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [newIngredientModal, setNewIngredientModal] = useState<IngredientKind | null>(null);
  const [sortKey, setSortKey] = useState<IngredientSortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedIngredients = useMemo(() => {
    const arr = [...ingredients];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '');
          break;
        case 'kind':
          cmp = (a.kind ?? 'ingredient').localeCompare(b.kind ?? 'ingredient');
          break;
        case 'unit_type':
          cmp = (a.unit_type ?? '').localeCompare(b.unit_type ?? '');
          break;
        case 'cost_per_unit':
          cmp = (a.cost_per_unit ?? 0) - (b.cost_per_unit ?? 0);
          break;
        case 'bottle_oz':
          cmp = (a.bottle_oz ?? 0) - (b.bottle_oz ?? 0);
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [ingredients, sortKey, sortDir]);

  const handleSort = (key: IngredientSortKey) => {
    setSortKey(key);
    setSortDir((d) => (sortKey === key && d === 'asc' ? 'desc' : 'asc'));
  };

  const SortHeader = ({ colKey, label }: { colKey: IngredientSortKey; label: string }) => (
    <th>
      <button
        type="button"
        className="ingredients-table-sort-header"
        onClick={() => handleSort(colKey)}
        aria-sort={sortKey === colKey ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      >
        {label}
        <span className="ingredients-table-sort-icon" aria-hidden>
          {sortKey === colKey ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}
        </span>
      </button>
    </th>
  );

  return (
    <div className="ingredients-manage-section">
      <p className="ingredients-manage-intro">
        Manage your pantry: add ingredients and maintenance costs, set unit types and costs.
        These are reused across menu items when building recipes.
      </p>
      <div className="ingredients-toolbar">
        <input
          type="search"
          placeholder="Search ingredients…"
          value={ingredientFilter}
          onChange={(e) => setIngredientFilter(e.target.value)}
          className="ingredients-search"
          aria-label="Filter ingredients by name"
        />
        <button type="button" className="btn btn-primary" onClick={() => setNewIngredientModal('ingredient')}>
          New ingredient
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setNewIngredientModal('liquor')}>
          New liquor
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setNewIngredientModal('maintenance')}>
          New maintenance cost
        </button>
      </div>
      {newIngredientModal && (
        <NewIngredientModal
          kind={newIngredientModal}
          onSave={(name, unit, cost, bottleOz) => {
            createIngredient(name, unit, cost, newIngredientModal, bottleOz);
            setNewIngredientModal(null);
          }}
          onClose={() => setNewIngredientModal(null)}
        />
      )}
      <div className="ingredients-table-wrap">
        <table className="ingredients-table">
          <thead>
            <tr>
              <SortHeader colKey="name" label="Name" />
              <SortHeader colKey="kind" label="Kind" />
              <SortHeader colKey="unit_type" label="Unit" />
              <SortHeader colKey="cost_per_unit" label="Cost" />
              <SortHeader colKey="bottle_oz" label="Bottle (oz)" />
              <th aria-hidden>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedIngredients.map((ing) => (
              <tr
                key={ing.id}
                className={
                  ing.kind === 'maintenance'
                    ? 'ingredient-row--maintenance'
                    : ing.kind === 'liquor'
                      ? 'ingredient-row--liquor'
                      : ''
                }
              >
                <td>
                  <input
                    placeholder="Name"
                    value={ing.name}
                    onChange={(e) => updateIngredient(ing.id, { name: e.target.value })}
                    aria-label={`Name for ingredient ${ing.id}`}
                  />
                </td>
                <td>
                  <select
                    value={ing.kind ?? 'ingredient'}
                    onChange={(e) => {
                      const k = e.target.value as IngredientKind;
                      updateIngredient(ing.id, {
                        kind: k,
                        bottle_oz: k === 'liquor' ? (ing.bottle_oz ?? 25.4) : undefined,
                      });
                    }}
                    aria-label={`Kind for ${ing.name || 'ingredient'}`}
                  >
                    <option value="ingredient">Ingredient</option>
                    <option value="liquor">Liquor</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </td>
                <td>
                  <select
                    value={ing.unit_type}
                    onChange={(e) => updateIngredient(ing.id, { unit_type: e.target.value as Ingredient['unit_type'] })}
                    aria-label={`Unit for ${ing.name || 'ingredient'}`}
                  >
                    {UNIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className="input-with-prefix">
                    <span className="input-prefix">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={editingNum[`cost-${ing.id}`] ?? (Number.isFinite(ing.cost_per_unit) ? String(ing.cost_per_unit) : '')}
                      onFocus={() =>
                        setEditingNum((e) => ({
                          ...e,
                          [`cost-${ing.id}`]: Number.isFinite(ing.cost_per_unit) ? String(ing.cost_per_unit) : '',
                        }))
                      }
                      onChange={(e) => setEditingNum((prev) => ({ ...prev, [`cost-${ing.id}`]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      onBlur={() => {
                        const raw = editingNum[`cost-${ing.id}`];
                        if (raw == null) return;
                        const n = Math.max(0, parseFloat(raw) || 0);
                        updateIngredient(ing.id, { cost_per_unit: n });
                        setEditingNum((prev) => {
                          const next = { ...prev };
                          delete next[`cost-${ing.id}`];
                          return next;
                        });
                      }}
                      aria-label={`Cost per unit for ${ing.name || 'ingredient'}`}
                    />
                  </span>
                </td>
                <td>
                  {(ing.kind ?? 'ingredient') === 'liquor' ? (
                    <input
                      type="number"
                      min={1}
                      step={0.1}
                      className="ingredient-bottle-input"
                      value={editingNum[`bottle-${ing.id}`] ?? (Number.isFinite(ing.bottle_oz) ? String(ing.bottle_oz) : '')}
                      onFocus={() =>
                        setEditingNum((e) => ({
                          ...e,
                          [`bottle-${ing.id}`]: Number.isFinite(ing.bottle_oz) ? String(ing.bottle_oz) : '25.4',
                        }))
                      }
                      onChange={(e) =>
                        setEditingNum((prev) => ({ ...prev, [`bottle-${ing.id}`]: e.target.value }))
                      }
                      onBlur={() => {
                        const raw = editingNum[`bottle-${ing.id}`];
                        if (raw == null) return;
                        const n = parseFloat(raw);
                        updateIngredient(ing.id, {
                          bottle_oz: Number.isFinite(n) && n > 0 ? n : 25.4,
                        });
                        setEditingNum((prev) => {
                          const next = { ...prev };
                          delete next[`bottle-${ing.id}`];
                          return next;
                        });
                      }}
                      placeholder="25.4"
                      aria-label={`Bottle oz for ${ing.name || 'ingredient'}`}
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeIngredient(ing.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ingredients.length === 0 && (
          <p className="ingredients-manage-empty">
            {ingredientFilter.trim()
              ? 'No ingredients match your search.'
              : 'No ingredients yet. Add one above or add them when building recipes.'}
          </p>
        )}
      </div>
    </div>
  );
}

function NewIngredientForm({
  initialName,
  onSave,
  onCancel,
}: {
  initialName: string;
  onSave: (name: string, unit: Ingredient['unit_type'], cost: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState<Ingredient['unit_type']>('oz');
  const [cost, setCost] = useState('');

  const handleSubmit = () => {
    const c = Math.max(0, parseFloat(cost) || 0);
    if (name.trim()) onSave(name.trim(), unit, c);
  };
  const isValid = name.trim().length > 0;

  return (
    <div className="menu-item-new-ingredient-form">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isValid) handleSubmit();
        }}
        placeholder="Ingredient name"
        className="menu-item-new-ingredient-input"
        autoFocus
      />
      <select
        value={unit}
        onChange={(e) => setUnit(e.target.value as Ingredient['unit_type'])}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && isValid) handleSubmit();
        }}
        className="menu-item-new-ingredient-select"
      >
        {UNIT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <span className="menu-item-new-ingredient-cost">
        $<input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isValid) handleSubmit();
          }}
          className="menu-item-new-ingredient-cost-input"
        />
        /{unit}
      </span>
      <div className="menu-item-new-ingredient-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleSubmit}
        >
          Add
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

type IngredientsTab = 'menu' | 'ingredients';
type MenuViewMode = 'cards' | 'table';
type MenuSortKey = 'name' | 'price' | 'cost' | 'margin' | 'target';

export default function DashboardIngredientsPage() {
  const {
    marginGoal,
    setMarginGoal,
    menuPrices,
    setMenuPrices,
    menuMarginGoal,
    setMenuMarginGoal,
    editingNum,
    setEditingNum,
    selectedRecipeName,
    setSelectedRecipeName,
    uniqueItemNames,
    itemCosts,
    ingredients,
    recipes,
    addMenuItem,
    removeMenuItem,
    renameMenuItem,
    getOrCreateRecipe,
    addRecipeLine,
    removeRecipeLine,
    updateIngredient,
    createIngredient,
    removeIngredient,
    findOrCreateIngredient,
    ingredientFilter,
    setIngredientFilter,
    filteredIngredients,
    menuItemIsDrink,
    setMenuItemIsDrink,
  } = useDashboardData();

  const [activeTab, setActiveTab] = useState<IngredientsTab>('menu');
  const [menuViewMode, setMenuViewMode] = useState<MenuViewMode>('table');
  const [menuFilter, setMenuFilter] = useState('');
  const [menuSortKey, setMenuSortKey] = useState<MenuSortKey>('name');
  const [menuSortDir, setMenuSortDir] = useState<'asc' | 'desc'>('asc');
  const [expandedTableRow, setExpandedTableRow] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<{
    menuItemName: string;
    ingredientId: string;
    mode: 'qty' | 'cost';
  } | null>(null);
  const [editingLineQty, setEditingLineQty] = useState('');
  const [editingLineUnit, setEditingLineUnit] = useState<Ingredient['unit_type']>('oz');
  const [editingCostValue, setEditingCostValue] = useState('');
  const [pendingQuantity, setPendingQuantity] = useState<{
    menuItemName: string;
    ingredientId: string;
    ingredientName: string;
    ingredientUnit: Ingredient['unit_type'];
  } | null>(null);
  const [pendingQtyValue, setPendingQtyValue] = useState('');
  const [pendingQtyUnit, setPendingQtyUnit] = useState<Ingredient['unit_type']>('oz');
  const [editingMenuItemName, setEditingMenuItemName] = useState<string | null>(null);
  const [editingMenuItemDraft, setEditingMenuItemDraft] = useState('');

  const handleSelectExisting = (menuItemName: string, ing: Ingredient) => {
    setPendingQuantity({
      menuItemName,
      ingredientId: ing.id,
      ingredientName: ing.name,
      ingredientUnit: ing.unit_type,
    });
    setPendingQtyValue('');
    setPendingQtyUnit(ing.unit_type);
  };

  const handleAddWithQuantity = () => {
    if (!pendingQuantity) return;
    const userQty = parseFloat(pendingQtyValue) || 0;
    if (userQty > 0) {
      const quantityInIngredientUnit = convertUnit(
        userQty,
        pendingQtyUnit,
        pendingQuantity.ingredientUnit
      );
      addRecipeLine(
        pendingQuantity.menuItemName,
        pendingQuantity.ingredientId,
        quantityInIngredientUnit,
        pendingQtyUnit
      );
      setPendingQuantity(null);
      setPendingQtyValue('');
    }
  };

  const filteredAndSortedMenuItems = useMemo(() => {
    const q = menuFilter.trim().toLowerCase();
    let items = q
      ? uniqueItemNames.filter((n) => n.toLowerCase().includes(q))
      : [...uniqueItemNames];
    items = [...items].sort((a, b) => {
      const recipeA = getOrCreateRecipe(a);
      const recipeB = getOrCreateRecipe(b);
      const costA = itemCosts.get(a) ?? 0;
      const costB = itemCosts.get(b) ?? 0;
      const priceA = menuPrices[a];
      const priceB = menuPrices[b];
      const targetA = menuMarginGoal[a] != null ? menuMarginGoal[a] * 100 : marginGoal * 100;
      const targetB = menuMarginGoal[b] != null ? menuMarginGoal[b] * 100 : marginGoal * 100;
      const marginA =
        priceA != null && priceA > 0 && costA >= 0 ? ((priceA - costA) / priceA) * 100 : -1;
      const marginB =
        priceB != null && priceB > 0 && costB >= 0 ? ((priceB - costB) / priceB) * 100 : -1;

      let cmp = 0;
      switch (menuSortKey) {
        case 'name':
          cmp = a.localeCompare(b);
          break;
        case 'price':
          cmp = (priceA ?? 0) - (priceB ?? 0);
          break;
        case 'cost':
          cmp = costA - costB;
          break;
        case 'margin':
          cmp = marginA - marginB;
          break;
        case 'target':
          cmp = targetA - targetB;
          break;
        default:
          cmp = a.localeCompare(b);
      }
      return menuSortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [
    uniqueItemNames,
    menuFilter,
    menuSortKey,
    menuSortDir,
    getOrCreateRecipe,
    itemCosts,
    menuPrices,
    menuMarginGoal,
    marginGoal,
  ]);

  return (
    <div className="menu-items-page">
      <header className="menu-items-page-header">
        <div className="menu-items-page-header-inner">
          <h1 className="menu-items-page-title">Menu &amp; recipes</h1>
          <div className="menu-items-page-tabs">
            <button
              type="button"
              className={`menu-items-page-tab ${activeTab === 'menu' ? 'menu-items-page-tab--active' : ''}`}
              onClick={() => setActiveTab('menu')}
            >
              Menu items
            </button>
            <button
              type="button"
              className={`menu-items-page-tab ${activeTab === 'ingredients' ? 'menu-items-page-tab--active' : ''}`}
              onClick={() => setActiveTab('ingredients')}
            >
              Manage ingredients
            </button>
          </div>
          {activeTab === 'menu' && (
          <div className="menu-items-page-margin-pill">
            <label htmlFor="default-margin" className="menu-items-page-margin-label">
              Target margin
            </label>
            <span className="menu-items-page-margin-input-wrap">
              <input
                id="default-margin"
                type="text"
                inputMode="numeric"
                placeholder="75"
                value={
                  editingNum['default-margin'] ?? String(Math.round(marginGoal * 100))
                }
                onFocus={() =>
                  setEditingNum((e) => ({
                    ...e,
                    'default-margin': String(Math.round(marginGoal * 100)),
                  }))
                }
                onChange={(e) =>
                  setEditingNum((prev) => ({ ...prev, 'default-margin': e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                onBlur={() => {
                  const raw = editingNum['default-margin'];
                  if (raw == null) return;
                  const n = Math.max(0, Math.min(100, parseFloat(raw) || 0));
                  setMarginGoal(n / 100);
                  setEditingNum((prev) => {
                    const next = { ...prev };
                    delete next['default-margin'];
                    return next;
                  });
                }}
                className="menu-items-page-margin-input"
                aria-label="Default target margin percent"
              />
              <span className="menu-items-page-margin-suffix">%</span>
            </span>
          </div>
          )}
        </div>
      </header>

      {activeTab === 'ingredients' ? (
        <>
        <ManageIngredientsTable
          ingredients={filteredIngredients}
          ingredientFilter={ingredientFilter}
          setIngredientFilter={setIngredientFilter}
          createIngredient={createIngredient}
          updateIngredient={updateIngredient}
          removeIngredient={removeIngredient}
          editingNum={editingNum}
          setEditingNum={setEditingNum}
        />
        </>
      ) : (
        <>
      <p className="menu-items-page-intro">
        Add menu items and what goes in each. Reuse ingredients across items — e.g. ranch and buffalo sauce in both wings and salad.
      </p>

      {/* Menu toolbar: filter, view toggle, sort */}
      <div className="menu-items-toolbar">
        <input
          type="search"
          placeholder="Search menu items…"
          value={menuFilter}
          onChange={(e) => setMenuFilter(e.target.value)}
          className="menu-items-search"
          aria-label="Filter menu items by name"
        />
        <div className="menu-items-view-toggle">
          <button
            type="button"
            className={`btn btn-secondary btn-sm ${menuViewMode === 'cards' ? 'btn--active' : ''}`}
            onClick={() => setMenuViewMode('cards')}
          >
            Cards
          </button>
          <button
            type="button"
            className={`btn btn-secondary btn-sm ${menuViewMode === 'table' ? 'btn--active' : ''}`}
            onClick={() => setMenuViewMode('table')}
          >
            Table
          </button>
        </div>
        <div className="menu-items-sort">
          <label htmlFor="menu-sort" className="menu-items-sort-label">
            Sort by
          </label>
          <select
            id="menu-sort"
            value={menuSortKey}
            onChange={(e) => setMenuSortKey(e.target.value as MenuSortKey)}
            className="menu-items-sort-select"
            aria-label="Sort menu items by"
          >
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="cost">Cost</option>
            <option value="margin">Margin %</option>
            <option value="target">Target %</option>
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm menu-items-sort-dir"
            onClick={() => setMenuSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            title={menuSortDir === 'asc' ? 'Ascending (click for descending)' : 'Descending (click for ascending)'}
            aria-label={`Sort ${menuSortDir === 'asc' ? 'ascending' : 'descending'}`}
          >
            {menuSortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Add new menu item */}
      <div className="menu-item-add-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setAddModalOpen(true)}
        >
          Add item
        </button>
      </div>

      {/* Add item modal */}
      {addModalOpen && (
        <AddItemModal
          onAdd={(name, price) => {
            addMenuItem(name);
            setMenuPrices((p) => ({ ...p, [name]: price }));
            setAddModalOpen(false);
          }}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {/* Menu item forms: table or cards */}
      {menuViewMode === 'table' ? (
        <div className="menu-items-table-wrap">
          <table className="menu-items-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Margin</th>
                <th>Target</th>
                <th>Drink</th>
                <th aria-hidden>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedMenuItems.map((name) => {
                const recipe = getOrCreateRecipe(name);
                const cost = itemCosts.get(name) ?? 0;
                const price = menuPrices[name];
                const targetMarginPct =
                  menuMarginGoal[name] != null ? menuMarginGoal[name] * 100 : marginGoal * 100;
                const currentMarginPct =
                  price != null && price > 0 && cost >= 0
                    ? ((price - cost) / price) * 100
                    : null;
                const atOrAboveTarget =
                  currentMarginPct != null && currentMarginPct >= targetMarginPct;
                const isExpanded = expandedTableRow === name;

                return (
                  <React.Fragment key={name}>
                    <tr
                      className={`menu-items-table-row ${isExpanded ? 'menu-items-table-row--expanded' : ''}`}
                    >
                      <td>
                        <button
                          type="button"
                          className="menu-items-table-expand"
                          onClick={() => setExpandedTableRow(isExpanded ? null : name)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Collapse recipe' : 'Expand recipe'}
                        >
                          {isExpanded ? '▼' : '▶'} {name}
                        </button>
                      </td>
                      <td>
                        <span className="input-with-prefix">
                          <span className="input-prefix">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={
                              editingNum[`price-${name}`] ??
                              (name in menuPrices && Number.isFinite(menuPrices[name])
                                ? String(menuPrices[name])
                                : '')
                            }
                            onFocus={() =>
                              setEditingNum((e) => ({
                                ...e,
                                [`price-${name}`]:
                                  name in menuPrices && Number.isFinite(menuPrices[name])
                                    ? String(menuPrices[name])
                                    : '',
                              }))
                            }
                            onChange={(e) =>
                              setEditingNum((prev) => ({ ...prev, [`price-${name}`]: e.target.value }))
                            }
                            onBlur={() => {
                              const raw = editingNum[`price-${name}`];
                              if (raw == null) return;
                              if (raw.trim() === '') {
                                setMenuPrices((p) => {
                                  const next = { ...p };
                                  delete next[name];
                                  return next;
                                });
                              } else {
                                setMenuPrices((p) => ({
                                  ...p,
                                  [name]: Math.max(0, parseFloat(raw) || 0),
                                }));
                              }
                              setEditingNum((prev) => {
                                const next = { ...prev };
                                delete next[`price-${name}`];
                                return next;
                              });
                            }}
                            className="menu-items-table-input"
                            aria-label={`Price for ${name}`}
                          />
                        </span>
                      </td>
                      <td>${cost.toFixed(2)}</td>
                      <td>
                        {currentMarginPct != null ? (
                          <span
                            className={`menu-item-margin-badge menu-item-margin-badge--inline ${
                              atOrAboveTarget ? 'menu-item-margin-badge--ok' : 'menu-item-margin-badge--low'
                            }`}
                          >
                            {currentMarginPct.toFixed(1)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{targetMarginPct.toFixed(0)}%</td>
                      <td>{menuItemIsDrink[name] ? 'Yes' : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => removeMenuItem(name)}
                          aria-label={`Remove ${name}`}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${name}-expanded`} className="menu-items-table-detail-row">
                        <td colSpan={7}>
                          <div className="menu-items-table-detail">
                            <div className="menu-items-table-detail-header">
                              <strong>{name}</strong> — Recipe ({recipe.lines.length} ingredients)
                            </div>
                            <ul className="menu-items-table-detail-lines">
                              {recipe.lines.map((line) => {
                                const ing = ingredients.find((i) => i.id === line.ingredient_id);
                                const lineCostVal = ing ? lineCost(line, ingredients) : 0;
                                const display = lineDisplay(line, ingredients);
                                return (
                                  <li key={line.ingredient_id}>
                                    {display.quantity} {display.unit} {ing?.name ?? '?'} — ${lineCostVal.toFixed(2)}
                                  </li>
                                );
                              })}
                            </ul>
                            <p className="menu-items-table-detail-hint">
                              Switch to Cards view to edit recipes.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filteredAndSortedMenuItems.length === 0 && (
            <p className="menu-items-empty">
              {menuFilter.trim()
                ? 'No menu items match your search.'
                : 'No menu items yet. Add one above to get started.'}
            </p>
          )}
        </div>
      ) : (
      <>
      <div className="menu-items-list">
        {filteredAndSortedMenuItems.map((name) => {
          const recipe = getOrCreateRecipe(name);
          const cost = itemCosts.get(name) ?? 0;
          const price = menuPrices[name];
          const targetMarginPct =
            menuMarginGoal[name] != null ? menuMarginGoal[name] * 100 : marginGoal * 100;
          const currentMarginPct =
            price != null && price > 0 && cost >= 0
              ? ((price - cost) / price) * 100
              : null;
          const atOrAboveTarget =
            currentMarginPct != null && currentMarginPct >= targetMarginPct;

          return (
            <section key={name} className="menu-item-card">
              <div className="menu-item-card-header">
                <input
                  type="text"
                  value={editingMenuItemName === name ? editingMenuItemDraft : name}
                  onChange={(e) => {
                    if (editingMenuItemName === name) {
                      setEditingMenuItemDraft(e.target.value);
                    } else {
                      setEditingMenuItemName(name);
                      setEditingMenuItemDraft(e.target.value);
                    }
                  }}
                  onFocus={() => {
                    setEditingMenuItemName(name);
                    setEditingMenuItemDraft(name);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') {
                      setEditingMenuItemDraft(name);
                      setEditingMenuItemName(null);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  onBlur={() => {
                    if (editingMenuItemName !== name) return;
                    const v = editingMenuItemDraft.trim();
                    if (v && v !== name) renameMenuItem(name, v);
                    setEditingMenuItemName(null);
                    setEditingMenuItemDraft('');
                  }}
                  className="menu-item-card-name"
                  aria-label="Menu item name"
                />
                <label
                  className="menu-item-drink-toggle"
                  title="Mark as drink for liquor variance tracking"
                >
                  <input
                    type="checkbox"
                    checked={!!menuItemIsDrink[name]}
                    onChange={(e) =>
                      setMenuItemIsDrink((prev) => ({
                        ...prev,
                        [name]: e.target.checked,
                      }))
                    }
                    aria-label={`${name} is a drink`}
                  />
                  <span>Drink</span>
                </label>
                <label className="menu-item-card-price">
                  <span className="menu-item-card-price-prefix">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={
                      editingNum[`price-${name}`] ??
                      (name in menuPrices && Number.isFinite(menuPrices[name])
                        ? String(menuPrices[name])
                        : '')
                    }
                    onFocus={() =>
                      setEditingNum((e) => ({
                        ...e,
                        [`price-${name}`]:
                          name in menuPrices && Number.isFinite(menuPrices[name])
                            ? String(menuPrices[name])
                            : '',
                      }))
                    }
                    onChange={(e) =>
                      setEditingNum((prev) => ({ ...prev, [`price-${name}`]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    onBlur={() => {
                      const raw = editingNum[`price-${name}`];
                      if (raw == null) return;
                      if (raw.trim() === '') {
                        setMenuPrices((p) => {
                          const next = { ...p };
                          delete next[name];
                          return next;
                        });
                      } else {
                        setMenuPrices((p) => ({
                          ...p,
                          [name]: Math.max(0, parseFloat(raw) || 0),
                        }));
                      }
                      setEditingNum((prev) => {
                        const next = { ...prev };
                        delete next[`price-${name}`];
                        return next;
                      });
                    }}
                    aria-label={`Price for ${name}`}
                  />
                </label>
                <button
                  type="button"
                  className="menu-item-card-remove"
                  onClick={() => removeMenuItem(name)}
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>
              </div>

              {/* Target, cost & margin */}
              <div className="menu-item-pricing">
                <label className="menu-item-pricing-field">
                  <span>Target</span>
                    <input
                    type="text"
                    inputMode="numeric"
                    placeholder={String(Math.round(marginGoal * 100))}
                    value={
                      editingNum[`target-${name}`] ??
                      (menuMarginGoal[name] != null
                        ? String(Math.round(menuMarginGoal[name] * 100))
                        : '')
                    }
                    onFocus={() =>
                      setEditingNum((e) => ({
                        ...e,
                        [`target-${name}`]:
                          menuMarginGoal[name] != null
                            ? String(Math.round(menuMarginGoal[name] * 100))
                            : '',
                      }))
                    }
                    onChange={(e) =>
                      setEditingNum((prev) => ({ ...prev, [`target-${name}`]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    onBlur={() => {
                      const raw = editingNum[`target-${name}`];
                      if (raw == null) return;
                      if (raw.trim() === '') {
                        setMenuMarginGoal((m) => {
                          const next = { ...m };
                          delete next[name];
                          return next;
                        });
                      } else {
                        const pct = Math.max(0, Math.min(100, parseFloat(raw) || 0));
                        setMenuMarginGoal((m) => ({ ...m, [name]: pct / 100 }));
                      }
                      setEditingNum((prev) => {
                        const next = { ...prev };
                        delete next[`target-${name}`];
                        return next;
                      });
                    }}
                    aria-label={`Target margin % for ${name}`}
                  />
                  <span className="menu-item-pricing-suffix">%</span>
                </label>
                <span className="menu-item-cost-total">
                  Cost: ${cost.toFixed(2)}/serving
                </span>
                {currentMarginPct != null && (
                  <span
                    className={`menu-item-margin-badge ${atOrAboveTarget ? 'menu-item-margin-badge--ok' : 'menu-item-margin-badge--low'}`}
                    title={atOrAboveTarget ? 'Profit margin at or above target' : 'Profit margin below target — raise price or shrink portions slightly to bridge the gap'}
                  >
                    Margin {currentMarginPct.toFixed(1)}% {atOrAboveTarget ? '✓' : ''}
                  </span>
                )}
              </div>

              {/* Add ingredient: searchable dropdown */}
              <div className="menu-item-add-ingredient">
                {pendingQuantity && pendingQuantity.menuItemName === name && (
                  <div className="menu-item-quantity-prompt">
                    <label className="menu-item-quantity-prompt-label">
                      How much <strong>{pendingQuantity.ingredientName}</strong> per serving?
                    </label>
                    <div className="menu-item-quantity-prompt-row">
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={pendingQtyValue}
                        onChange={(e) => setPendingQtyValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddWithQuantity();
                          if (e.key === 'Escape') {
                            setPendingQuantity(null);
                            setPendingQtyValue('');
                          }
                        }}
                        className="menu-item-quantity-prompt-input"
                        autoFocus
                        aria-label="Quantity per serving"
                      />
                      <select
                        value={pendingQtyUnit}
                        onChange={(e) =>
                          setPendingQtyUnit(e.target.value as Ingredient['unit_type'])
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && parseFloat(pendingQtyValue) > 0)
                            handleAddWithQuantity();
                        }}
                        className="menu-item-quantity-prompt-unit-select"
                        aria-label="Unit"
                      >
                        {UNIT_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleAddWithQuantity}
                        disabled={!(parseFloat(pendingQtyValue) > 0)}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setPendingQuantity(null);
                          setPendingQtyValue('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <SearchableIngredientDropdown
                  ingredients={ingredients.filter((i) => i.name)}
                  onSelectExisting={(ing) => handleSelectExisting(name, ing)}
                  onAddNew={(ingName, unit, cost) => {
                    const id = findOrCreateIngredient(ingName, unit, cost);
                    setPendingQuantity({
                      menuItemName: name,
                      ingredientId: id,
                      ingredientName: ingName,
                      ingredientUnit: unit,
                    });
                    setPendingQtyUnit(unit);
                    setPendingQtyValue('');
                  }}
                  placeholder="Search or add ingredient…"
                />
              </div>

              {/* Ingredient lines */}
              <div className="menu-item-lines-wrapper">
                {recipe.lines.length > 0 && (
                  <div className="menu-item-lines-header" role="row">
                    <div className="menu-item-lines-header-ingredient">
                      <span>Qty & ingredient</span>
                      <span
                        className="menu-item-lines-header-cost"
                        title="Cost per serving for this item (qty × unit cost)"
                      >
                        Cost/serving
                      </span>
                    </div>
                    <div className="menu-item-lines-header-meta">
                      <span
                        className="menu-item-lines-header-unit-cost"
                        title="Price per unit (e.g. per lb). Edit to change; affects all menu items using this ingredient."
                      >
                        Unit cost
                      </span>
                    </div>
                  </div>
                )}
              <ul className="menu-item-lines">
                {recipe.lines.length === 0 && (
                  <li className="menu-item-lines-empty">
                    Add at least one ingredient above.
                  </li>
                )}
                {recipe.lines.map((line) => {
                  const ing = ingredients.find((i) => i.id === line.ingredient_id);
                  const lineCostVal = ing ? lineCost(line, ingredients) : 0;
                  const display = lineDisplay(line, ingredients);
                  const isEditingQty =
                    editingLine?.menuItemName === name &&
                    editingLine?.ingredientId === line.ingredient_id &&
                    editingLine?.mode === 'qty';
                  const isEditingCost =
                    editingLine?.menuItemName === name &&
                    editingLine?.ingredientId === line.ingredient_id &&
                    editingLine?.mode === 'cost';

                  const handleStartEditQty = () => {
                    setEditingLine({ menuItemName: name, ingredientId: line.ingredient_id, mode: 'qty' });
                    setEditingLineQty(String(display.quantity));
                    setEditingLineUnit((line.display_unit ?? ing?.unit_type ?? 'oz') as Ingredient['unit_type']);
                  };
                  const handleSaveQty = () => {
                    if (!ing) return;
                    const userQty = parseFloat(editingLineQty) || 0;
                    if (userQty > 0) {
                      const qtyInIngredientUnit = convertUnit(
                        userQty,
                        editingLineUnit,
                        ing.unit_type
                      );
                      addRecipeLine(name, line.ingredient_id, qtyInIngredientUnit, editingLineUnit);
                    }
                    setEditingLine(null);
                  };
                  const handleStartEditCost = () => {
                    setEditingLine({ menuItemName: name, ingredientId: line.ingredient_id, mode: 'cost' });
                    setEditingCostValue(ing ? String(ing.cost_per_unit) : '');
                  };
                  const handleSaveCost = () => {
                    if (!ing) return;
                    const c = Math.max(0, parseFloat(editingCostValue) || 0);
                    updateIngredient(ing.id, { cost_per_unit: c });
                    setEditingLine(null);
                  };

                  return (
                    <li key={line.ingredient_id} className="menu-item-line">
                      {isEditingQty ? (
                        <div className="menu-item-line-edit-qty">
                          <div className="menu-item-line-edit-controls">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editingLineQty}
                              onChange={(e) => setEditingLineQty(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveQty();
                                if (e.key === 'Escape') setEditingLine(null);
                              }}
                              className="menu-item-line-edit-input"
                              autoFocus
                            />
                            <select
                              value={editingLineUnit}
                              onChange={(e) =>
                                setEditingLineUnit(e.target.value as Ingredient['unit_type'])
                              }
                              className="menu-item-line-edit-unit"
                            >
                              {UNIT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            <span className="menu-item-line-edit-qty-name">{ing?.name ?? '?'}</span>
                          </div>
                          <div className="menu-item-line-edit-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={handleSaveQty}
                              disabled={!(parseFloat(editingLineQty) > 0)}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingLine(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : isEditingCost ? (
                        <div className="menu-item-line-edit-cost">
                          <div className="menu-item-line-edit-controls">
                            <span className="menu-item-line-edit-cost-label">
                              {ing?.name ?? '?'} per {ing?.unit_type ?? 'unit'}:
                            </span>
                            <span className="menu-item-line-edit-cost-input-wrap">
                              $<input
                                type="text"
                                inputMode="decimal"
                                value={editingCostValue}
                                onChange={(e) => setEditingCostValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveCost();
                                  if (e.key === 'Escape') setEditingLine(null);
                                }}
                                className="menu-item-line-edit-input"
                                autoFocus
                              />
                            </span>
                          </div>
                          <div className="menu-item-line-edit-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={handleSaveCost}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingLine(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="menu-item-line-ingredient">
                            <button
                              type="button"
                              className="menu-item-line-qty"
                              onClick={handleStartEditQty}
                              title="Click to edit quantity"
                            >
                              {display.quantity} {display.unit} {ing?.name ?? '?'}
                              <span className="menu-item-line-qty-hint" aria-hidden>✎</span>
                            </button>
                            <span
                              className="menu-item-line-cost"
                              title={
                                ing
                                  ? `Cost per serving: ${display.quantity} ${display.unit} × $${ing.cost_per_unit.toFixed(2)}/${ing.unit_type} = $${lineCostVal.toFixed(2)}`
                                  : 'Cost per serving for this item (qty × unit cost)'
                              }
                            >
                              ${lineCostVal.toFixed(2)}
                            </span>
                          </div>
                          <div className="menu-item-line-meta">
                            <button
                              type="button"
                              className="menu-item-line-unit-cost"
                              onClick={handleStartEditCost}
                              title="Edit unit cost (affects all items using this ingredient)"
                            >
                              <span className="menu-item-line-unit-cost-value">
                                {`$` + (ing?.cost_per_unit.toFixed(2) ?? '0') + '/' + (ing?.unit_type ?? 'unit')}
                              </span>
                              <span className="menu-item-line-unit-cost-hint" aria-hidden>✎</span>
                            </button>
                            <button
                              type="button"
                              className="menu-item-line-remove"
                              onClick={() => removeRecipeLine(name, line.ingredient_id)}
                              aria-label={`Remove ${ing?.name ?? 'ingredient'}`}
                            >
                              ×
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              </div>
            </section>
          );
        })}
      </div>

      {filteredAndSortedMenuItems.length === 0 && (
        <div className="menu-items-empty">
          <p>
            {menuFilter.trim()
              ? 'No menu items match your search.'
              : 'No menu items yet. Add one above to get started.'}
          </p>
        </div>
      )}
      </>
      )}
    </>
    )}
    </div>
  );
}
