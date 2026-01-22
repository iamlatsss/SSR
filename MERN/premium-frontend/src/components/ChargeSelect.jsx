import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

const ChargeSelect = ({ value, onChange, options = [], placeholder = "Select Charge...", className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [filteredOptions, setFilteredOptions] = useState([]);
    const wrapperRef = useRef(null);
    const listRef = useRef(null);

    // Initial filter when value or options change
    useEffect(() => {
        if (!value) {
            setFilteredOptions([]);
            return;
        }
        const lowerSearch = value.toLowerCase();
        // Limit to 50 results for performance
        const filtered = options.filter(opt =>
            (opt.name || opt).toLowerCase().includes(lowerSearch)
        ).slice(0, 50);
        setFilteredOptions(filtered);
    }, [value, options]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Scroll active item into view
    useEffect(() => {
        if (isOpen && listRef.current && activeIndex >= 0) {
            const activeItem = listRef.current.children[activeIndex];
            if (activeItem) {
                activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [activeIndex, isOpen]);

    const handleKeyDown = (e) => {
        // If not open, Open on Down/Enter
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                if (value) setIsOpen(true);
            }
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
            } else if (filteredOptions.length > 0) {
                // If user hits enter without navigating, select first match?
                // Common behavior is to select the first one if it's a good match, or do nothing.
                // Let's select first if available, or just do nothing.
                // User requested "keyboard navigations", implying standard dropdown behavior.
                // If activeIndex is -1, usually Enter creates a new entry or does nothing.
                // Let's do nothing if no active selection.
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            e.preventDefault(); // Prevent modal closing if inside one
        } else if (e.key === 'Tab') {
            setIsOpen(false);
        }
    };

    const handleSelect = (option) => {
        const val = option.name || option;
        onChange(val);
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleInputChange = (e) => {
        onChange(e.target.value);
        setIsOpen(true);
        setActiveIndex(-1);
    };

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <input
                type="text"
                value={value || ""}
                onChange={handleInputChange}
                onFocus={() => {
                    // Only open if there is text (User Req: "not fully visible when clicked")
                    if (value && filteredOptions.length > 0) setIsOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoComplete="off"
                className={`w-full bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 ${className}`}
            />

            {isOpen && filteredOptions.length > 0 && (
                <div
                    ref={listRef}
                    className="absolute z-50 w-full min-w-[200px] mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar left-0"
                >
                    {filteredOptions.map((option, index) => {
                        const label = option.name || option;
                        return (
                            <div
                                key={index}
                                className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center transition-colors
                                    ${index === activeIndex ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}
                                    ${value === label ? 'font-medium' : ''}
                                `}
                                onClick={() => handleSelect(option)}
                            >
                                <span>{label}</span>
                                {value === label && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ChargeSelect;
