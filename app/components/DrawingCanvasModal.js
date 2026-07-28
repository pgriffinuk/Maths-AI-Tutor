'use client';
import { useEffect, useRef, useState } from 'react';
import { imageAttachmentFromDataUrl } from '../../lib/imageUpload';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;

// A simple single-colour canvas for writing or sketching a problem by hand,
// instead of typing it or photographing it - "Use this" converts the
// drawing to a PNG and feeds it into the same image-attachment pipeline as
// photo upload/clipboard paste (see lib/imageUpload.js), so the caller just
// treats the result exactly like any other attached image.
//
// Uses pointer events (not mouse-only) so it works with touch and stylus
// input on tablets, not just a mouse.
export default function DrawingCanvasModal({ onUse, onCancel }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [strokeColor, setStrokeColor] = useState('#1C2541');

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Resolved once here rather than baked into the component, so the pen
    // colour always matches the app's actual --ink token.
    const inkValue = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
    if (inkValue) setStrokeColor(inkValue);
  }, []);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function handlePointerDown(e) {
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPos(e);
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPointRef.current = pos;
    setIsEmpty(false);
  }

  function stopDrawing() {
    drawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  function handleUse() {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onUse(imageAttachmentFromDataUrl(dataUrl));
  }

  return (
    <div className="confirm-overlay">
      <div className="card confirm-dialog drawing-dialog">
        <div className="q-label">Draw or write your problem</div>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="drawing-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
        />
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" onClick={handleClear} disabled={isEmpty}>Clear</button>
          <button type="button" className="primary" onClick={handleUse} disabled={isEmpty}>Use this</button>
          <button type="button" className="link-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
