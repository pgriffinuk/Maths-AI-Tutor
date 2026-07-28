// Reads an image File into a data URL (for a thumbnail preview) plus the
// base64 payload and media type Anthropic's image content block format
// needs - shared by every chat surface that supports a photo attachment.
export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const match = /^data:(.+);base64,(.*)$/.exec(reader.result || '');
      if (!match) { reject(new Error('Could not read that image.')); return; }
      resolve({ dataUrl: reader.result, mediaType: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}
