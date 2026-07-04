import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCommandRegistry } from '../contexts/CommandContext';
import { CommandSearchResult } from '../types/commands';
import { useEnhancedKeyboardShortcuts } from '../hooks/useEnhancedKeyboardShortcuts';
import { MaterialIcon } from './ApplicationFormUI';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

type PaletteDisplayItem = {
    key: string;
    title: string;
    subtitle?: string;
    icon: string;
    execute: () => void;
    closeOnExecute: boolean;
    shortcut?: string;
};

const DEFAULT_APPLICATION_LIMIT = 12;
const APPLICATION_SHOW_INCREMENT = 12;
const GROUP_ORDER = ['Actions', 'Navigation', 'Settings', 'Search', 'Applications'];

const kbdClass = 'px-1.5 py-0.5 rounded bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa]';

const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [applicationLimit, setApplicationLimit] = useState(DEFAULT_APPLICATION_LIMIT);
    const { searchCommands, getCommandShortcuts } = useCommandRegistry();
    const { shortcuts } = useEnhancedKeyboardShortcuts({}, { listen: false });
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const filteredResults = useMemo(() => {
        return searchCommands(query);
    }, [query, searchCommands]);

    const commandShortcutMap = useMemo(() => {
        const map = new Map<string, string>();
        getCommandShortcuts().forEach((shortcut) => {
            map.set(shortcut.commandId, shortcut.keys);
        });
        shortcuts.forEach((shortcut) => {
            map.set(shortcut.commandId, shortcut.keys);
        });
        return map;
    }, [getCommandShortcuts, shortcuts]);

    const groupedResults = useMemo(() => {
        const groups: { [key: string]: CommandSearchResult[] } = {};
        filteredResults.forEach(result => {
            const category = result.command.group;
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(result);
        });
        return groups;
    }, [filteredResults]);

    const renderedGroups = useMemo(() => {
        const withShowMore = Object.fromEntries(
            Object.entries(groupedResults).map(([group, results]) => {
                if (group !== 'Applications') {
                    const commandItems = results.map(result => ({
                        key: result.command.id,
                        title: result.command.title,
                        subtitle: result.command.subtitle,
                        icon: result.command.icon,
                        execute: result.command.execute,
                        closeOnExecute: true,
                        shortcut: commandShortcutMap.get(result.command.id),
                    }));

                    return [group, commandItems];
                }

                const visibleResults = results.slice(0, applicationLimit);
                const items: PaletteDisplayItem[] = visibleResults.map(result => ({
                    key: result.command.id,
                    title: result.command.title,
                    subtitle: result.command.subtitle,
                    icon: result.command.icon,
                    execute: result.command.execute,
                    closeOnExecute: true,
                    shortcut: commandShortcutMap.get(result.command.id),
                }));

                const hiddenCount = results.length - items.length;
                if (hiddenCount > 0) {
                    items.push({
                        key: `show-more-${group}-${applicationLimit}-${query}`,
                        title: `Show ${hiddenCount} more applications`,
                        subtitle: 'Press Enter to show additional matches',
                        icon: 'expand_more',
                        execute: () => setApplicationLimit(prev => prev + APPLICATION_SHOW_INCREMENT),
                        closeOnExecute: false,
                        shortcut: undefined,
                    });
                }

                return [group, items];
            })
        );

        const groupEntries = Object.entries(withShowMore);
        const sortedGroups = groupEntries.sort(([groupA], [groupB]) => {
            const aIndex = GROUP_ORDER.indexOf(groupA);
            const bIndex = GROUP_ORDER.indexOf(groupB);
            if (aIndex === -1 && bIndex === -1) {
                return groupA.localeCompare(groupB);
            }
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });

        const flattened = sortedGroups.flatMap(([, results]) => results);

        return { groups: sortedGroups, flattened };
    }, [groupedResults, commandShortcutMap, applicationLimit, query]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setApplicationLimit(DEFAULT_APPLICATION_LIMIT);
        }
    }, [isOpen]);

    useEffect(() => {
        if (renderedGroups.flattened.length > 0 && selectedIndex >= renderedGroups.flattened.length) {
            setSelectedIndex(0);
        }
    }, [renderedGroups.flattened.length, selectedIndex]);

    useEffect(() => {
        setApplicationLimit(DEFAULT_APPLICATION_LIMIT);
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        const selectedElement = scrollContainerRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const itemCount = renderedGroups.flattened.length;
        if (!itemCount) {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % itemCount);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + itemCount) % itemCount);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selectedItem = renderedGroups.flattened[selectedIndex];
            if (selectedItem) {
                selectedItem.execute();
                if (selectedItem.closeOnExecute) {
                    onClose();
                }
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        } else if (e.key === 'Home') {
            e.preventDefault();
            setSelectedIndex(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            setSelectedIndex(itemCount - 1);
        } else if (e.key === 'PageDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 10, itemCount - 1));
        } else if (e.key === 'PageUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 10, 0));
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 liquid-glass-modal"
                    onClick={onClose}
                    aria-hidden="true"
                />
                <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Command Palette"
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative w-full max-w-2xl mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="liquid-glass-modal-content rounded-2xl overflow-hidden shadow-2xl border border-[#27272a]">
                        <div className="flex items-center gap-4 p-5 border-b border-[#27272a] bg-[#18181b]">
                            <MaterialIcon name="search" className="text-2xl text-[#a1a1aa]" aria-hidden="true" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type to search... (> actions, @ apps, # filters)"
                                className="flex-1 bg-transparent border-none outline-none text-[#f4f4f5] text-xl placeholder-[#a1a1aa]/50"
                                autoFocus
                                aria-label="Search commands"
                                aria-controls="command-palette-listbox"
                            />
                            <div className="flex items-center gap-2">
                                <kbd className={`${kbdClass} text-[10px] font-bold uppercase tracking-tighter`}>
                                    ESC
                                </kbd>
                            </div>
                        </div>

                        <div
                            id="command-palette-listbox"
                            ref={scrollContainerRef}
                            className="max-h-[50vh] overflow-y-auto liquid-scrollbar"
                            role="listbox"
                        >
                            {filteredResults.length === 0 ? (
                                <div className="p-12 text-center text-[#a1a1aa]">
                                    <MaterialIcon name="search_off" className="text-5xl mb-3 opacity-30" aria-hidden="true" />
                                    <p className="text-lg font-medium opacity-60">No results found for "{query}"</p>
                                    <p className="text-sm opacity-40 mt-1">Try a different search or use tokens like {'>'} or @</p>
                                </div>
                            ) : (
                                <>
                                    {renderedGroups.groups.map(([category, results]) => (
                                        <div key={category} className="py-2">
                                            <div className="px-5 py-2 text-[10px] font-bold text-[#a1a1aa]/60 uppercase tracking-[0.2em]">
                                                {category}
                                            </div>
                                                {results.map((result) => {
                                                const globalIndex = renderedGroups.flattened.indexOf(result);
                                                const isSelected = globalIndex === selectedIndex;
                                                
                                                return (
                                                    <div
                                                        key={result.key}
                                                        data-index={globalIndex}
                                                        onClick={() => {
                                                            result.execute();
                                                            if (result.closeOnExecute) {
                                                                onClose();
                                                            }
                                                        }}
                                                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                        className={`group w-full flex items-center gap-4 px-5 py-3 transition-all cursor-pointer relative ${isSelected
                                                                ? 'bg-[#27272a]/80 text-[#f4f4f5]'
                                                                : 'hover:bg-[#27272a]/40 text-[#f4f4f5]/80'
                                                            }`}
                                                        role="option"
                                                        aria-selected={isSelected}
                                                    >
                                                        {isSelected && (
                                                            <motion.div 
                                                                layoutId="active-indicator"
                                                                className="absolute left-0 w-1 h-2/3 bg-[#dc2626] rounded-r-full" 
                                                            />
                                                        )}
                                                            <div className={`flex items-center justify-center w-10 h-10 rounded-xl transition-colors ${
                                                                isSelected ? 'bg-[#dc2626]/20 text-[#f4f4f5]' : 'bg-[#18181b] text-[#a1a1aa]/50 group-hover:text-[#a1a1aa]'
                                                            }`}>
                                                            <MaterialIcon name={result.icon} className="text-2xl" aria-hidden="true" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`font-semibold truncate ${isSelected ? 'text-[#f4f4f5]' : 'text-[#f4f4f5]/90'}`}>
                                                                {result.title}
                                                            </div>
                                                            {result.subtitle && (
                                                                <div className={`text-xs truncate mt-0.5 ${isSelected ? 'text-[#a1a1aa]' : 'text-[#a1a1aa]/50'}`}>
                                                                    {result.subtitle}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {result.shortcut && (
                                                            <kbd className={`ml-auto px-2 py-1 text-[10px] font-bold rounded border transition-colors ${
                                                                isSelected 
                                                                    ? 'text-[#f4f4f5] bg-[#dc2626]/30 border-[#dc2626]/40' 
                                                                    : 'text-[#a1a1aa]/50 bg-[#18181b] border-[#27272a]'
                                                            }`}>
                                                                {result.shortcut}
                                                            </kbd>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-[#27272a] bg-[#09090b]/60 flex items-center justify-between text-[10px] text-[#a1a1aa]/50 font-medium">
                            <div className="flex items-center gap-5">
                                <span className="flex items-center gap-1.5">
                                    <kbd className={kbdClass}>↑↓</kbd>
                                    <span className="uppercase tracking-wider">Navigate</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className={kbdClass}>Enter</kbd>
                                    <span className="uppercase tracking-wider">Select</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className={`${kbdClass} font-bold`}>#</kbd>
                                    <span className="uppercase tracking-wider">Filters</span>
                                </span>
                            </div>
                            <div className="uppercase tracking-[0.1em]">
                                {renderedGroups.flattened.length} Result{renderedGroups.flattened.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CommandPalette;
