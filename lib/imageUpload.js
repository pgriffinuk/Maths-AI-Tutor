// Shared image-attachment pipeline: every surface that lets a student
// attach an image (file picker, clipboard paste, or the drawing canvas)
// ends up with the same { dataUrl, mediaType, base64 } shape - dataUrl for
// the thumbnail preview, base64 + mediaType for Anthropic's image content
// block format.
function parseDataUrl(dataUrl) {
  const match = /^data:(.+);base64,(.*)$/.exec(dataUrl || '');
  if (!match) return null;
  return { dataUrl, mediaType: match[1], base64: match[2] };
}

// Used by the file-picker (ImageAttachButton) and clipboard-paste image
// attachment paths.
export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseDataUrl(reader.result);
      if (!parsed) { reject(new Error('Could not read that image.')); return; }
      resolve(parsed);
    };
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

// Used by the drawing canvas, whose "Use this" button already has a data
// URL in hand (canvas.toDataURL()) rather than a File to read.
export function imageAttachmentFromDataUrl(dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error('Could not read that drawing.');
  return parsed;
}
