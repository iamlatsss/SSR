import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
  showOnlyWhenTyping = false, // if true, only show options when typing; if false, show options on click
  variant = "default"   // 'default' or 'grid'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, minWidth: 220, maxWidth: 450, maxHeight: 240, placement: 'bottom' });
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const dropdownRef = useRef(null);

  // Derive active label for display
  const activeOption = useMemo(() => {
    return options.find(opt => {
      if (typeof opt === 'object' && opt !== null) {
        return String(opt[valueKey]) === String(value) || String(opt[labelKey]) === String(value);
      }
      return String(opt) === String(value);
    });
  }, [options, value, valueKey, labelKey]);

  const displayLabel = useMemo(() => {
    if (activeOption) {
      return typeof activeOption === 'object' ? activeOption[labelKey] : activeOption;
    }
    if (allowCustom && value) {
      return String(value);
    }
    return "";
  }, [activeOption, labelKey, allowCustom, value]);

  // Sync searchQuery with display label when not actively editing
  useEffect(() => {
    if (!isEditing) {
      setSearchQuery(displayLabel);
    }
  }, [isEditing, displayLabel]);

  // Dynamic coordinates calculation to escape any table/container overflow clipping
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = 220;
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const minWidth = Math.max(rect.width, variant === "grid" ? 220 : 260);
    const maxWidth = Math.min(Math.max(rect.width * 1.5, 380), window.innerWidth - 20);

    let left = rect.left;
    if (left + minWidth > window.innerWidth - 12) {
      left = Math.max(10, window.innerWidth - minWidth - 12);
    }

    const availableHeight = openUpwards ? Math.max(120, spaceAbove - 16) : Math.max(120, spaceBelow - 16);
    const maxHeight = Math.min(availableHeight, 260);

    setCoords({
      top: openUpwards ? Math.max(8, rect.top - maxHeight - 4) : rect.bottom + 4,
      left: Math.max(10, left),
      minWidth,
      maxWidth,
      maxHeight,
      placement: openUpwards ? 'top' : 'bottom'
    });
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = (e) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // When clicked, enter edit mode
  const handleBoxClick = () => {
    if (disabled) return;
    setIsEditing(true);
    if (!showOnlyWhenTyping) {
      setIsOpen(true);
      updatePosition();
    }
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 20);
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchQuery(text);
    if (showOnlyWhenTyping) {
      if (text.trim().length > 0) {
        setIsOpen(true);
        updatePosition();
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(true);
      updatePosition();
    }

    if (allowCustom && text.trim().length === 0) {
      onChange("");
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const isInsideContainer = containerRef.current && containerRef.current.contains(e.target);
      const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);

      if (!isInsideContainer && !isInsideDropdown) {
        if (allowCustom && isOpen && searchQuery.trim() && !options.some(opt => {
          const text = (typeof opt === 'object' ? opt[labelKey] : String(opt)).toLowerCase();
          return text === searchQuery.toLowerCase().trim();
        })) {
          onChange(searchQuery.trim());
        }
        setIsOpen(false);
        setIsEditing(false);
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
    if (!isOpen) return [];

    const query = searchQuery.toLowerCase().trim();
    const isCurrentLabel = displayLabel && query === displayLabel.toLowerCase().trim();

    if (showOnlyWhenTyping && (!query || isCurrentLabel)) return [];

    let scored = [];

    // If query is empty or unchanged from the currently selected label, show all options!
    if (!query || isCurrentLabel) {
      scored = options.map(opt => ({ option: opt, score: 0 }));
    } else {
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
            score = 100;
          } else if (text.startsWith(query)) {
            score = 80;
          } else {
            const index = text.indexOf(query);
            if (index !== -1) {
              score = 50 - index;
            } else {
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
        .sort((a, b) => b.score - a.score);
    }

    const baseOptions = scored.map(item => item.option);

    if (allowCustom && query && !isCurrentLabel && !options.some(opt => {
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
  }, [options, searchQuery, isOpen, labelKey, allowCustom, valueKey, showOnlyWhenTyping, displayLabel]);

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

  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredOptions]);

  const handleSelect = (option) => {
    const val = typeof option === 'object' ? option[valueKey] : option;
    onChange(val);
    setIsOpen(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        if (!showOnlyWhenTyping) {
          setIsOpen(true);
          updatePosition();
        }
      } else if (e.key === 'Escape') {
        setIsEditing(false);
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
          handleSelect(filteredOptions[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setIsEditing(false);
        break;
      case 'Tab':
        setIsOpen(false);
        setIsEditing(false);
        break;
      default:
        break;
    }
  };

  const shouldRenderList = isOpen && (!showOnlyWhenTyping || searchQuery.trim().length > 0);

  return (
    <div className="relative w-full text-left" ref={containerRef} onKeyDown={handleKeyDown}>
      <div
        onClick={handleBoxClick}
        className={variant === "grid"
          ? `w-full h-full flex items-center justify-between bg-transparent rounded-none px-1 py-1 text-xs transition-all select-none border-0 focus-within:ring-0 focus-within:outline-none focus-within:bg-indigo-50/20 dark:focus-within:bg-indigo-950/20 ${disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"} ${className}`
          : `w-full flex items-center justify-between cursor-pointer bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 select-none ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "hover:border-slate-300 dark:hover:border-slate-600"} ${className}`
        }
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className={`w-full bg-transparent border-none outline-none p-0 m-0 ${variant === "grid" ? "text-xs" : "text-sm"} text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 focus:outline-none`}
            placeholder={displayLabel || placeholder}
            value={searchQuery}
            onChange={handleInputChange}
            disabled={disabled}
            autoComplete="off"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={`block truncate ${variant === "grid" ? "text-xs" : "text-sm"} ${displayLabel ? "text-slate-900 dark:text-white font-normal" : "text-slate-400"}`}>
            {displayLabel || placeholder}
          </span>
        )}
        <div className="flex items-center gap-1.5 pl-1.5 text-slate-400 pointer-events-none">
          {isEditing ? <Search size={variant === "grid" ? 13 : 15} /> : <ChevronDown size={variant === "grid" ? 13 : 16} />}
        </div>
      </div>

      {shouldRenderList && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            minWidth: `${coords.minWidth}px`,
            maxWidth: `${coords.maxWidth}px`,
            zIndex: 999999
          }}
          className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-100 ${dropdownClassName}`}
        >
          <div
            ref={listRef}
            style={{ maxHeight: `${coords.maxHeight}px` }}
            className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50 custom-scrollbar"
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
                    <span className="whitespace-normal break-words pr-3 leading-relaxed">{optLabel}</span>
                    {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableDropdown;
