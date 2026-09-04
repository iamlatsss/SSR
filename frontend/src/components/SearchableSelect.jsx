import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const SearchableSelect = ({
  label,
  value,
  onChange,
  name,
  options = [],
  placeholder = "Select package type...",
  labelClassName = "",
  inputClassName = "",
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.trim().length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
    setActiveIndex(-1);
    onChange({ target: { name, value: val } });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return [];
    return options.filter(opt => opt.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const handleSelect = (option) => {
    setSearchTerm(option);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange({ target: { name, value: option } });
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filteredOptions[activeIndex]) {
        handleSelect(filteredOptions[activeIndex]);
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
        <label className={labelClassName}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          name={name}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${inputClassName} pr-8`}
          autoComplete="off"
        />
        <span
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer pointer-events-none"
        >
          <ChevronDown size={14} />
        </span>
      </div>

      {isOpen && searchTerm.trim().length > 0 && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden focus:outline-none">
          {filteredOptions.length > 0 ? (
            <ul className="py-1" ref={listRef}>
              {filteredOptions.map((opt, idx) => (
                <li
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer select-none transition-colors ${
                    activeIndex === idx
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : opt === value
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="truncate">{opt}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-4 text-xs text-center text-slate-400 dark:text-slate-500 italic">
              No matching options
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
