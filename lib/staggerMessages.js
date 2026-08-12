// Appends each item in a multi-segment AI chat reply with a short,
// randomised delay between each one becoming visible, so a reply that's
// been split into 2-3 short bursts (see lib/socraticTutor.js's
// CHAT_REPLY_STYLE_RULES) reads like natural texting rather than every
// bubble appearing at once. Shared by /chatbot and both of the dashboard's
// chat surfaces so the pacing can't drift between them.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function appendStaggered(items, appendOne) {
  for (let i = 0; i < items.length; i++) {
    if (i > 0) await sleep(400 + Math.random() * 200);
    appendOne(items[i]);
  }
}
