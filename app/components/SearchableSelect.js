'use client';
import { useEffect, useId, useRef, useState } from 'react';

const BACK_ITEM = '__BACK_TO_TOPICS__';

// A two-level type-to-filter combobox for a course's topic list. `topics` is
// an array of { name, subtopics: string[] } (see lib/levels.js) - the panel
// initially lists only main topic names; clicking one with more than one
// subtopic drills into a filterable list of just that topic's subtopics
// (with a "back to topics" row to return), while clicking one with exactly
// one subtopic selects that subtopic directly, no extra step. `value` and
// the value passed to `onChange` are always a specific subtopic string,
// never a main topic name - that's the only thing ever sent to the AI or
// stored as an attempt's topic.
export default function SearchableSelect({ topics, value, onChange }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  // 'main' or the name of the topic whose subtopics are currently shown.
  const [panel, setPanel] = useState('main');
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

  // Opens the panel on whichever level currently makes sense: if the
  // selected subtopic belongs to a topic with more than one subtopic, open
  // straight into that topic's subtopic list (so re-opening the dropdown
  // shows where the current selection actually lives), otherwise the main
  // topic list.
  function openPanel() {
    const owningTopic = topics.find((t) => t.subtopics.includes(value));
    setPanel(owningTopic && owningTopic.subtopics.length > 1 ? owningTopic.name : 'main');
    setIsOpen(true);
    setHighlightedIndex(0);
  }

  const currentTopic = panel === 'main' ? null : topics.find((t) => t.name === panel);
  const panelList = panel === 'main'
    ? topics.map((t) => t.name)
    : [BACK_ITEM, ...(currentTopic ? currentTopic.subtopics : [])];

  // Shows the full current panel's list as soon as it's opened (or
  // cleared), and only starts narrowing once something new has actually
  // been typed - otherwise the first click in would just show the current
  // selection matching itself, which isn't useful. The back row is always
  // kept regardless of the filter text.
  const trimmed = inputValue.trim().toLowerCase();
  const filteredOptions = (trimmed === '' || inputValue === value)
    ? panelList
    : panel === 'main'
      ? panelList.filter((o) => o.toLowerCase().includes(trimmed))
      : [BACK_ITEM, ...panelList.slice(1).filter((o) => o.toLowerCase().includes(trimmed))];

  function selectSubtopic(subtopic) {
    setInputValue(subtopic);
    setIsOpen(false);
    setPanel('main');
    onChange(subtopic);
  }

  function chooseItem(item) {
    if (panel === 'main') {
      const topic = topics.find((t) => t.name === item);
      if (!topic) return;
      if (topic.subtopics.length > 1) {
        setPanel(topic.name);
        setInputValue('');
        setHighlightedIndex(0);
      } else {
        selectSubtopic(topic.subtopics[0]);
      }
    } else if (item === BACK_ITEM) {
      setPanel('main');
      setInputValue('');
      setHighlightedIndex(0);
    } else {
      selectSubtopic(item);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        openPanel();
      } else {
        setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        openPanel();
      } else {
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredOptions[highlightedIndex]) {
        chooseItem(filteredOptions[highlightedIndex]);
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
        onFocus={openPanel}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div className="searchable-select-panel" role="listbox" id={listboxId}>
          {filteredOptions.length === 0 ? (
            <div className="searchable-select-empty">No matching topics</div>
          ) : (
            filteredOptions.map((option, i) => {
              const isBack = option === BACK_ITEM;
              const drillsDown = panel === 'main' && (topics.find((t) => t.name === option)?.subtopics.length ?? 0) > 1;
              return (
                <div
                  key={option}
                  id={`${listboxId}-option-${i}`}
                  role="option"
                  aria-selected={option === value}
                  className={`searchable-select-option${i === highlightedIndex ? ' highlighted' : ''}${option === value ? ' selected' : ''}${isBack ? ' back' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); chooseItem(option); }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                >
                  {isBack ? '‹ Back to topics' : option}
                  {drillsDown && <span className="searchable-select-chevron">›</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
