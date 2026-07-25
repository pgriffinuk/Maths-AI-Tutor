'use client';
import { useEffect, useId, useRef, useState } from 'react';

// A type-to-filter combobox for long option lists (e.g. a course's full
// topic list), used in place of a native <select> where the list is long
// enough that scrolling through it is worse than just typing a few
// letters. options is a plain array of strings - value/onChange work the
// same way a native <select>'s do, so this drops in as a replacement.
export default function SearchableSelect({ options, value, onChange }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef(null);
  const listboxId = useId();

  // Keep the displayed text in sync whenever the selection changes from
  // outside this component (board/course change resetting the topic,
  // Guided Path selecting a topic directly, etc).
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close (and revert any unsubmitted typed text) on an outside click -
  // option clicks themselves use onMouseDown+preventDefault below, so they
  // never trigger this via a blur/focus-out first.
  useEffect(() => {
    function handleDocumentMouseDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setInputValue(value || '');
      }
    }
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [value]);

  // Shows the full list as soon as the box is opened (or cleared), and only
  // starts narrowing once the student has actually typed something new -
  // otherwise the first click in would just show the current topic
  // matching itself, which isn't useful.
  const trimmed = inputValue.trim().toLowerCase();
  const filteredOptions = (trimmed === '' || inputValue === value)
    ? options
    : options.filter((o) => o.toLowerCase().includes(trimmed));

  function selectOption(option) {
    setInputValue(option);
    setIsOpen(false);
    onChange(option);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredOptions[highlightedIndex]) {
        selectOption(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setInputValue(value || '');
      }
    }
  }

  const highlightedId = isOpen && filteredOptions[highlightedIndex]
    ? `${listboxId}-option-${highlightedIndex}`
    : undefined;

  return (
    <div className="searchable-select" ref={wrapperRef}>
      <input
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={highlightedId}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div className="searchable-select-panel" role="listbox" id={listboxId}>
          {filteredOptions.length === 0 ? (
            <div className="searchable-select-empty">No matching topics</div>
          ) : (
            filteredOptions.map((option, i) => (
              <div
                key={option}
                id={`${listboxId}-option-${i}`}
                role="option"
                aria-selected={option === value}
                className={`searchable-select-option${i === highlightedIndex ? ' highlighted' : ''}${option === value ? ' selected' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); selectOption(option); }}
                onMouseEnter={() => setHighlightedIndex(i)}
              >
                {option}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
