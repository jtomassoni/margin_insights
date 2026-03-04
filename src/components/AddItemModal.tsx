'use client';

import { useEffect, useRef, useState } from 'react';

export default function AddItemModal({
  onAdd,
  onClose,
  description = 'Name and price first, then add ingredients below.',
}: {
  onAdd: (name: string, price: number) => void;
  onClose: () => void;
  description?: string;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
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

  const priceNum = parseFloat(price) || 0;
  const isValid = name.trim().length > 0 && priceNum >= 0;

  return (
    <div
      className="menu-item-add-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-modal-title"
    >
      <div
        className="menu-item-add-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-item-modal-title" className="menu-item-add-modal-title">
          Add menu item
        </h2>
        <p className="menu-item-add-modal-desc">{description}</p>
        <label className="menu-item-add-modal-field">
          <span className="menu-item-add-modal-label">Name</span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (isValid) onAdd(name.trim(), priceNum);
              }
            }}
            placeholder="e.g. Buffalo Wings"
            className="menu-item-add-modal-input"
            aria-label="Menu item name"
          />
        </label>
        <label className="menu-item-add-modal-field">
          <span className="menu-item-add-modal-label">Price</span>
          <span className="menu-item-add-modal-price-wrap">
            <span className="menu-item-add-modal-price-prefix">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isValid) onAdd(name.trim(), priceNum);
              }}
              placeholder="0"
              className="menu-item-add-modal-input"
              aria-label="Price"
            />
          </span>
        </label>
        <div className="menu-item-add-modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => isValid && onAdd(name.trim(), priceNum)}
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
