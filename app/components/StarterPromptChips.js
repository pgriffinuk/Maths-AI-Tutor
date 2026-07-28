'use client';

const STARTER_PROMPTS = [
  "I don't understand a topic",
  "Check where I've gone wrong",
  "I'm stuck on a specific step",
  'Explain this differently'
];

// Shown only while a chat has no messages yet, alongside the greeting -
// clicking one fills the input with that phrasing rather than sending it
// straight away, so a student sees a range of ways to phrase a request
// but can still edit it before sending.
export default function StarterPromptChips({ onSelect, disabled }) {
  return (
    <div className="starter-chips">
      {STARTER_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          className="starter-chip"
          onClick={() => onSelect(prompt)}
          disabled={disabled}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
