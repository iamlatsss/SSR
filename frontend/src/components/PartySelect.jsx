import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Check, Search } from 'lucide-react';

const PartySelect = ({
  label,
  value,
  onChange,
  name,
  customers = [],
  isHybrid = false,
  placeholder = "Type to search party...",
  labelClassName = "",
  inputClassName = "",
  required = false,
  RequiredStar = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  // Sync display term when value changes from outside (e.g. loaded from API)
  useEffect(() => {
    if (isHybrid) {
      const match = customers.find(c => String(c.customer_id) === String(value));
      if (match) {
        setSearchTerm(match.name);
      } else {
        setSearchTerm(value || "");
      }
    } else {
      setSearchTerm(value || "");
    }
  }, [value, customers, isHybrid]);

  // Handle typing inside input
  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    setActiveIndex(-1);

    // Call onChange with the typed string value
    onChange({ target: { name, value: val } });
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter customers by typed search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === "") return [];
    const term = searchTerm.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(term));
  }, [customers, searchTerm]);

  const handleSelect = (customer) => {
    // If hybrid, store customer_id (as string/number). Otherwise, store name.
    const selectedValue = isHybrid ? String(customer.customer_id) : customer.name;
    setSearchTerm(customer.name);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange({ target: { name, value: selectedValue } });
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredCustomers.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filteredCustomers[activeIndex]) {
        handleSelect(filteredCustomers[activeIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {label && (
        <label className={labelClassName || "block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1"}>
          {label} {required && <span className="text-red-500 font-bold ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          name={name}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={inputClassName || "w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-all"}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search size={14} />
        </div>
      </div>

      {isOpen && filteredCustomers.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-lg max-h-48 overflow-y-auto custom-scrollbar"
        >
          {filteredCustomers.map((customer, index) => {
            const isSelected = isHybrid 
              ? String(customer.customer_id) === String(value)
              : customer.name === value;

            return (
              <div
                key={customer.customer_id}
                className={`px-3 py-1.5 text-xs cursor-pointer flex justify-between items-center transition-colors
                  ${index === activeIndex ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}
                  ${isSelected ? 'font-semibold text-indigo-600 dark:text-indigo-400' : ''}
                `}
                onClick={() => handleSelect(customer)}
              >
                <span>{customer.name}</span>
                {isSelected && <Check size={12} className="text-indigo-600 dark:text-indigo-400" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PartySelect;
