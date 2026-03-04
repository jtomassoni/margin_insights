'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AddItemModal from '@/components/AddItemModal';
import { useDashboardData } from '@/context/DashboardDataContext';

/**
 * Aggregate sales by item name (matches marginEngine logic).
 */
function aggregateSales(
  records: { item_name: string; units_sold: number; revenue: number }[]
): Map<string, { units_sold: number; revenue: number }> {
  const map = new Map<string, { units_sold: number; revenue: number }>();
  records.forEach((r) => {
    const key = r.item_name.trim();
    const existing = map.get(key) ?? { units_sold: 0, revenue: 0 };
    map.set(key, {
      units_sold: existing.units_sold + r.units_sold,
      revenue: existing.revenue + r.revenue,
    });
  });
  return map;
}

export default function DashboardSalesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const {
    salesRecords,
    setSalesRecords,
    uniqueItemNames,
    menuPrices,
    setMenuPrices,
    addMenuItem,
    hasAnyMenuItems,
  } = useDashboardData();

  const [editingNum, setEditingNum] = useState<Record<string, string>>({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [savedRow, setSavedRow] = useState<string | null>(null);

  const salesByItem = useMemo(
    () => aggregateSales(salesRecords),
    [salesRecords]
  );

  const rows = useMemo(() => {
    const itemSet = new Set(uniqueItemNames);
    const fromSales = Array.from(salesByItem.keys()).filter(
      (name) => !itemSet.has(name)
    );
    return [...uniqueItemNames, ...fromSales].sort();
  }, [uniqueItemNames, salesByItem]);

  const updateUnitsForItem = (itemName: string, units_sold: number) => {
    const price = menuPrices[itemName] ?? 0;
    const revenue = Math.round(units_sold * price * 100) / 100;
    setSalesRecords((prev) => {
      const rest = prev.filter((r) => r.item_name.trim() !== itemName);
      if (units_sold > 0) {
        return [...rest, { item_name: itemName.trim(), units_sold, revenue }];
      }
      return rest;
    });
  };

  const updatePriceForItem = (itemName: string, price: number) => {
    setMenuPrices((prev) => ({ ...prev, [itemName]: price }));
    const units = salesByItem.get(itemName)?.units_sold ?? 0;
    const revenue = Math.round(units * price * 100) / 100;
    setSalesRecords((prev) => {
      const rest = prev.filter((r) => r.item_name.trim() !== itemName);
      if (units > 0) {
        return [...rest, { item_name: itemName.trim(), units_sold: units, revenue }];
      }
      return rest;
    });
  };

  if (!hasAnyMenuItems) {
    return (
      <div className="demo-layout">
        <main className="demo-main">
          <section className="dashboard-section">
            <section className="dashboard-empty">
              <h2>Sales data</h2>
              <p>
                Add your menu items first so we know what to track. Once you have
                items defined, you can enter units sold and price per item for
                your reporting period.
              </p>
              <div className="dashboard-empty-actions">
                <Link href={`/dashboard/${slug}/ingredients`} className="btn btn-primary">
                  Add menu items first
                </Link>
              </div>
            </section>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="sales-page">
      <header className="sales-page-header">
        <h1 className="sales-page-title">Sales data</h1>
      </header>
      <p className="sales-page-intro">
        Enter units sold and menu price per item for your reporting period (e.g.
        last month). Revenue is computed automatically. Price edits sync to Menu
        &amp; Recipes.
      </p>

      <div className="sales-add-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setAddModalOpen(true)}
        >
          Add item
        </button>
      </div>

      {addModalOpen && (
        <AddItemModal
          onAdd={(name, price) => {
            addMenuItem(name);
            setMenuPrices((prev) => ({ ...prev, [name]: price }));
            setAddModalOpen(false);
          }}
          onClose={() => setAddModalOpen(false)}
        />
      )}
      <div className="sales-table-wrap">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Units sold</th>
              <th>Price ($)</th>
              <th>Revenue</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((itemName) => {
              const current = salesByItem.get(itemName) ?? {
                units_sold: 0,
                revenue: 0,
              };
              const price = menuPrices[itemName] ?? 0;
              const revenue = current.units_sold > 0 && price > 0
                ? current.units_sold * price
                : current.revenue;
              const unitsKey = `units-${itemName}`;
              const priceKey = `price-${itemName}`;
              const unitsDisplay =
                editingNum[unitsKey] ?? String(current.units_sold);
              const priceDisplay =
                editingNum[priceKey] ??
                (price > 0 ? price.toFixed(2) : '');

              const handleBlurUnits = () => {
                const raw = editingNum[unitsKey];
                if (raw == null) return;
                const n = Math.max(0, Math.floor(parseFloat(raw) || 0));
                updateUnitsForItem(itemName, n);
                setEditingNum((prev) => {
                  const next = { ...prev };
                  delete next[unitsKey];
                  return next;
                });
              };
              const handleBlurPrice = () => {
                const raw = editingNum[priceKey];
                if (raw == null) return;
                const p = Math.max(0, parseFloat(raw) || 0);
                updatePriceForItem(itemName, p);
                setEditingNum((prev) => {
                  const next = { ...prev };
                  delete next[priceKey];
                  return next;
                });
              };

              const handleSaveRow = () => {
                const unitsRaw = editingNum[unitsKey] ?? String(current.units_sold);
                const priceRaw = editingNum[priceKey] ?? (price > 0 ? String(price) : '');
                const newUnits = Math.max(0, Math.floor(parseFloat(unitsRaw) || 0));
                const newPrice = Math.max(0, parseFloat(priceRaw) || 0);
                setMenuPrices((prev) => ({ ...prev, [itemName]: newPrice }));
                setSalesRecords((prev) => {
                  const rest = prev.filter((r) => r.item_name.trim() !== itemName);
                  if (newUnits > 0) {
                    const revenue = Math.round(newUnits * newPrice * 100) / 100;
                    return [...rest, { item_name: itemName.trim(), units_sold: newUnits, revenue }];
                  }
                  return rest;
                });
                setEditingNum((prev) => {
                  const next = { ...prev };
                  delete next[unitsKey];
                  delete next[priceKey];
                  return next;
                });
                setSavedRow(itemName);
                setTimeout(() => setSavedRow(null), 1500);
              };

              return (
                <tr key={itemName}>
                  <td className="sales-table-item">{itemName}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={unitsDisplay}
                      onFocus={() =>
                        setEditingNum((prev) => ({
                          ...prev,
                          [unitsKey]: String(current.units_sold),
                        }))
                      }
                      onChange={(e) =>
                        setEditingNum((prev) => ({
                          ...prev,
                          [unitsKey]: e.target.value,
                        }))
                      }
                      onBlur={handleBlurUnits}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="sales-table-input"
                      aria-label={`Units sold for ${itemName}`}
                    />
                  </td>
                  <td>
                    <span className="input-with-prefix">
                      <span className="input-prefix">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={priceDisplay}
                        onFocus={() =>
                          setEditingNum((prev) => ({
                            ...prev,
                            [priceKey]: price > 0 ? String(price) : '',
                          }))
                        }
                        onChange={(e) =>
                          setEditingNum((prev) => ({
                            ...prev,
                            [priceKey]: e.target.value,
                          }))
                        }
                        onBlur={handleBlurPrice}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')
                            (e.target as HTMLInputElement).blur();
                        }}
                        className="sales-table-input sales-table-input--price"
                        aria-label={`Price for ${itemName}`}
                      />
                    </span>
                  </td>
                  <td className="sales-table-revenue">
                    {revenue > 0 ? `$${revenue.toFixed(2)}` : '—'}
                  </td>
                  <td className="sales-table-actions">
                    <button
                      type="button"
                      className={`sales-save-btn ${savedRow === itemName ? 'sales-save-btn--saved' : ''}`}
                      onClick={handleSaveRow}
                      title="Save this row"
                      aria-label={`Save ${itemName}`}
                    >
                      {savedRow === itemName ? 'Saved' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="sales-empty">
            No items yet. Add menu items in Menu &amp; Recipes, or add an item
            above.
          </p>
        )}
      </div>

      <p className="sales-page-note">
        <strong>Tip:</strong> Revenue = units sold × price (computed automatically).
        Price edits here sync to Menu &amp; Recipes.
      </p>
    </div>
  );
}
