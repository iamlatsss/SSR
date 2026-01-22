import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { ChevronDown, Check, Search } from 'lucide-react';

const PortSelect = ({ label, value, onChange, name, placeholder = "Type to search port...", className = "" }) => {
    const [ports, setPorts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const listRef = useRef(null);

    // Fetch Ports Data
    useEffect(() => {
        const fetchPorts = async () => {
            try {
                const cached = sessionStorage.getItem('ssr_ports_data');
                if (cached) {
                    setPorts(JSON.parse(cached));
                    setLoading(false);
                    return;
                }

                const response = await api.get('/ports');
                if (response.data.success) {
                    const rawData = response.data.data;
                    const flattened = [];
                    Object.entries(rawData).forEach(([country, portList]) => {
                        portList.forEach(port => {
                            flattened.push(`${port}, ${country}`);
                        });
                    });
                    flattened.sort();
                    setPorts(flattened);
                    sessionStorage.setItem('ssr_ports_data', JSON.stringify(flattened));
                }
            } catch (error) {
                console.error("Failed to load ports:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPorts();
    }, []);

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

    // Filter Options
    const filteredOptions = useMemo(() => {
        if (!value) return [];
        const lowerSearch = value.toLowerCase();
        // Strict "Type to Open": only show if user has typed something
        return ports.filter(p => p.toLowerCase().includes(lowerSearch)).slice(0, 50);
    }, [ports, value]);

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
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
            } else if (filteredOptions.length > 0 && activeIndex === -1) {
                // If enter pressed without selection but options exist, select first? 
                // Better to force user to select or just keep current value.
                handleSelect(filteredOptions[0]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleSelect = (option) => {
        onChange({ target: { name, value: option } });
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleInputChange = (e) => {
        onChange(e);
        setIsOpen(true);
        setActiveIndex(-1);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}

            <div className="relative">
                <input
                    type="text"
                    name={name}
                    value={value || ""}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (value) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                    className={`w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder-slate-400 ${className}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {loading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                    ) : (
                        <Search size={16} />
                    )}
                </div>
            </div>

            {isOpen && filteredOptions.length > 0 && (
                <div
                    ref={listRef}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar"
                >
                    {filteredOptions.map((option, index) => (
                        <div
                            key={option}
                            className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center transition-colors
                                ${index === activeIndex ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}
                                ${value === option ? 'font-medium' : ''}
                            `}
                            onClick={() => handleSelect(option)}
                        >
                            <span>{option}</span>
                            {value === option && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PortSelect;
