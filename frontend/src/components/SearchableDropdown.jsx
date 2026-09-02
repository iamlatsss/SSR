import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

const SearchableDropdown = ({
  options = [],         // e.g. [{ value: '...', label: '...' }] or raw list
  value = "",           // active value matching valueKey
  onChange,             // callback: (val) => {}
  placeholder = "Select...",
  disabled = false,
  valueKey = "value",   // key to match in object option
  labelKey = "label",   // key to display / search in object option
  className = "",       // custom input styles
  dropdownClassName = "",
  noOptionsText = "No matching records found",
  allowCustom = false,  // allow custom text input if not found in list
  showOnlyWhenTyping = false, // only show options when user starts typing
  variant = "default"   // 'default' or 'grid'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Derive active label for display
  const activeOption = useMemo(() => {
    return options.find(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return String(opt[valueKey]) === String(value);
      }
      return String(opt) === String(value);
    });
  }, [options, value, valueKey]);

  const displayLabel = useMemo(() => {
    if (activeOption) {
      return typeof activeOption === 'object' ? activeOption[labelKey] : activeOption;
    }
    // If allowCustom and we have a value but no matching option, display the value itself
    if (allowCustom && value) {
      return String(value);
    }
    return "";
  }, [activeOption, labelKey, allowCustom, value]);

  // Sync searchQuery with display label when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(displayLabel);
    }
  }, [isOpen, displayLabel]);

  // Handle open/close
  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      setIsOpen(true);
      setSearchQuery(""); // Clear on focus/click to let user see everything or start typing fresh
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setIsOpen(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // If allowCustom and user typed a custom query and clicked away, select the custom query
        if (allowCustom && isOpen && searchQuery.trim() && !options.some(opt => {
          const text = (typeof opt === 'object' ? opt[labelKey] : String(opt)).toLowerCase();
          return text === searchQuery.toLowerCase().trim();
        })) {
          onChange(searchQuery.trim());
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen, searchQuery, options, labelKey, allowCustom, onChange]);

  // Intelligent dynamic scoring and filtering
  const filteredOptions = useMemo(() => {
    if (!isOpen) return options; // When closed, don't filter (saves compute)

    let scored = [];
    const query = searchQuery.toLowerCase().trim();

    if (!searchQuery.trim()) {
      scored = options.map(opt => ({ option: opt, score: 0 }));
    } else {
      // Map options to scores and filter out non-matching
      scored = options
        .map(opt => {
          let text = "";
          if (typeof opt === 'object' && opt !== null) {
            text = Object.values(opt).map(v => String(v || '')).join(' ').toLowerCase();
          } else {
            text = String(opt).toLowerCase();
          }
          
          let score = -1;
          if (text === query) {
            score = 100; // Exact match
          } else if (text.startsWith(query)) {
            score = 80;  // Starts with
          } else {
            // Check for partial word matching or containing
            const index = text.indexOf(query);
            if (index !== -1) {
              score = 50 - index; // Containing, match earlier in the text is slightly better
            } else {
              // Check for words match (all query words exist in text in any order)
              const queryWords = query.split(/\s+/).filter(Boolean);
              const matchesAll = queryWords.every(word => text.includes(word));
              if (matchesAll) {
                score = 20;
              }
            }
          }

          return { option: opt, score };
        })
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score); // Highest score first
    }

    const baseOptions = scored.map(item => item.option);

    // If allowCustom is enabled and user typed a unique entry, inject it
    if (allowCustom && searchQuery.trim() && !options.some(opt => {
      const text = (typeof opt === 'object' ? opt[labelKey] : String(opt)).toLowerCase();
      return text === query;
    })) {
      const customOpt = {
        [valueKey]: searchQuery.trim(),
        [labelKey]: `${searchQuery.trim()} (Custom)`
      };
      return [customOpt, ...baseOptions];
    }

    return baseOptions;
  }, [options, searchQuery, isOpen, labelKey, allowCustom, valueKey]);

  // Auto scroll option into view when keyboard navigating
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const parent = listRef.current;
      const child = parent.children[focusedIndex];
      if (child) {
        const parentRect = parent.getBoundingClientRect();
        const childRect = child.getBoundingClientRect();
        if (childRect.bottom > parentRect.bottom) {
          parent.scrollTop += (childRect.bottom - parentRect.bottom);
        } else if (childRect.top < parentRect.top) {
          parent.scrollTop -= (parentRect.top - childRect.top);
        }
      }
    }
  }, [focusedIndex]);

  // Reset focus when filteredOptions changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredOptions]);

  const handleSelect = (option) => {
    const val = typeof option === 'object' ? option[valueKey] : option;
    onChange(val);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        setSearchQuery("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleSelect(filteredOptions[focusedIndex]);
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0]); // select the best match if none focused
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative w-full text-left" ref={containerRef} onKeyDown={handleKeyDown}>
      <div
        onClick={toggleDropdown}
        className={variant === "grid"
          ? `w-full h-full flex items-center justify-between bg-transparent rounded-none px-1 py-1 text-xs transition-all select-none border-0 focus-within:ring-0 focus-within:outline-none focus-within:bg-indigo-50/20 dark:focus-within:bg-indigo-950/20 ${disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"} ${className}`
          : `w-full flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 select-none ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "hover:border-slate-300 dark:hover:border-slate-600"} ${className}`
        }
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            className={`w-full bg-transparent border-none outline-none p-0 m-0 ${variant === "grid" ? "text-xs" : "text-sm"} text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 focus:outline-none`}
            placeholder={displayLabel || placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            autoComplete="off"
            onClick={(e) => e.stopPropagation()} // Prevent clicking search input from closing dropdown
          />
        ) : (
          <span className={`block truncate ${variant === "grid" ? "text-xs" : "text-sm"} ${displayLabel ? "text-slate-900 dark:text-white font-normal" : "text-slate-400"}`}>
            {displayLabel || placeholder}
          </span>
        )}
        <div className="flex items-center gap-1.5 pl-1.5 text-slate-400 pointer-events-none">
          {isOpen ? <Search size={variant === "grid" ? 13 : 15} /> : <ChevronDown size={variant === "grid" ? 13 : 16} />}
        </div>
      </div>

      {isOpen && (!showOnlyWhenTyping || searchQuery.trim() !== "") && (
        <div className={`absolute z-[999] min-w-full w-max max-w-md md:max-w-lg lg:max-w-xl mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 ${dropdownClassName}`}>
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 custom-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 italic text-center">
                {noOptionsText}
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const optVal = typeof opt === 'object' ? opt[valueKey] : opt;
                const optLabel = typeof opt === 'object' ? opt[labelKey] : String(opt);
                const isSelected = String(optVal) === String(value);
                const isFocused = index === focusedIndex;

                return (
                  <div
                    key={index}
                    onClick={() => handleSelect(opt)}
                    className={`px-4 py-2.5 text-xs cursor-pointer flex justify-between items-center transition-all ${
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold"
                        : isFocused
                        ? "bg-slate-50 dark:bg-slate-700/40 text-slate-800 dark:text-slate-200"
                        : "hover:bg-slate-50 dark:hover:bg-slate-700/30 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span className="whitespace-normal break-words pr-4">{optLabel}</span>
                    {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
