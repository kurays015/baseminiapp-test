"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import styles from "./ArtCanvas.module.css";

/*
 * Mobile-first layout:
 *  - Canvas fills available space
 *  - Bottom dock with 4 tabs: Brush | Shape | Color | Settings
 *  - Active tab opens a slide-up tray above the dock
 *  - All tap targets ≥ 44px for thumb-friendliness
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#ffffff",
  "#000000",
  "#ff3b3b",
  "#ff8c00",
  "#ffe600",
  "#6366f1",
  "#00e5ff",
  "#2979ff",
  "#d500f9",
  "#ff4081",
  "#795548",
  "#607d8b",
];

export type BrushType = "pen" | "marker" | "spray" | "calligraphy" | "eraser";
export type ShapeType =
  | "none"
  | "line"
  | "rect"
  | "ellipse"
  | "triangle"
  | "star";
type TabType = "brush" | "shape" | "color" | "settings" | null;

const BRUSHES: { id: BrushType; icon: string; label: string }[] = [
  { id: "pen", icon: "✒️", label: "Pen" },
  { id: "marker", icon: "🖊️", label: "Marker" },
  { id: "spray", icon: "💨", label: "Spray" },
  { id: "calligraphy", icon: "🖋️", label: "Calli" },
  { id: "eraser", icon: "⬜", label: "Eraser" },
];

const SHAPES: { id: ShapeType; icon: string; label: string }[] = [
  { id: "none", icon: "✦", label: "Free" },
  { id: "line", icon: "╱", label: "Line" },
  { id: "rect", icon: "▭", label: "Rect" },
  { id: "ellipse", icon: "⬭", label: "Circle" },
  { id: "triangle", icon: "△", label: "Tri" },
  { id: "star", icon: "★", label: "Star" },
];

const BG_COLOR = "#0f172a";

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points = 5,
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
}

function sprayDots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  opacity: number,
) {
  const density = Math.ceil(size * 3);
  const radius = size * 4;
  ctx.save();
  ctx.globalAlpha = opacity * 0.15;
  ctx.fillStyle = color;
  for (let i = 0; i < density; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.random() * radius;
    ctx.beginPath();
    ctx.arc(
      x + dist * Math.cos(angle),
      y + dist * Math.sin(angle),
      Math.random() * 1.5 + 0.5,
      0,
      2 * Math.PI,
    );
    ctx.fill();
  }
  ctx.restore();
}

function applyShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  size: number,
  opacity: number,
  fill: boolean,
  dashed = false,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (dashed) ctx.setLineDash([6, 3]);
  ctx.beginPath();
  switch (shape) {
    case "line":
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      break;
    case "rect":
      ctx.rect(start.x, start.y, dx, dy);
      break;
    case "ellipse":
      ctx.ellipse(
        start.x + dx / 2,
        start.y + dy / 2,
        Math.abs(dx / 2),
        Math.abs(dy / 2),
        0,
        0,
        2 * Math.PI,
      );
      break;
    case "triangle":
      ctx.moveTo(start.x + dx / 2, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.lineTo(start.x, end.y);
      ctx.closePath();
      break;
    case "star": {
      const r = Math.sqrt(dx * dx + dy * dy) / 2;
      drawStar(ctx, start.x + dx / 2, start.y + dy / 2, r, r * 0.42);
      break;
    }
  }
  if (fill && shape !== "line") ctx.fill();
  else ctx.stroke();
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ArtCanvas({
  onExport,
  disabled,
}: {
  onExport?: (blob: Blob) => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);

  const [brush, setBrush] = useState<BrushType>("pen");
  const [shape, setShape] = useState<ShapeType>("none");
  const [color, setColor] = useState(PRESET_COLORS[2]);
  const [customColor, setCustomColor] = useState("#ff3b3b");
  const [size, setSize] = useState(6);
  const [opacity, setOpacity] = useState(1);
  const [fill, setFill] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const activeColor = color === "custom" ? customColor : color;

  // ── Resize canvas to match container ────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !overlay || !wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set display size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    // Set actual size in memory (scaled for retina)
    const width = rect.width * dpr;
    const height = rect.height * dpr;

    // Save current canvas content
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Resize
    canvas.width = width;
    canvas.height = height;
    overlay.width = width;
    overlay.height = height;

    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);
    overlay.getContext("2d")!.scale(dpr, dpr);

    // Restore or clear
    if (imageData.width > 0 && imageData.height > 0) {
      ctx.putImageData(imageData, 0, 0);
    } else {
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }, []);

  // ── Init canvas ─────────────────────────────────────────────────────────────
  useEffect(() => {
    resizeCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Initial clear
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Save initial state
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([imageData]);
    setHistoryIndex(0);

    // Handle window resize
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // ── Close tray on canvas tap ─────────────────────────────────────────────
  const closeTray = useCallback(() => setActiveTab(null), []);

  // ── Coordinate helper ───────────────────────────────────────────────────────
  const getPoint = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();

      if ("touches" in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        if (!t) return null;
        return {
          x: t.clientX - rect.left,
          y: t.clientY - rect.top,
        };
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [],
  );

  // ── Save to history ─────────────────────────────────────────────────────────
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      // Limit history to last 20 states to save memory
      if (newHistory.length > 20) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 19));
  }, [historyIndex]);

  // ── Freehand stroke ─────────────────────────────────────────────────────────
  const drawStroke = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      if (brush === "spray") {
        sprayDots(ctx, to.x, to.y, size, activeColor, opacity);
        return;
      }
      ctx.save();
      ctx.globalAlpha = brush === "marker" ? opacity * 0.55 : opacity;
      ctx.globalCompositeOperation =
        brush === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = brush === "eraser" ? "rgba(0,0,0,1)" : activeColor;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (brush === "calligraphy") {
        ctx.lineWidth = Math.max(
          1.5,
          size * Math.abs(Math.cos(Math.atan2(to.y - from.y, to.x - from.x))),
        );
      } else {
        ctx.lineWidth = brush === "eraser" ? size * 3 : size;
      }
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    },
    [brush, activeColor, size, opacity],
  );

  // ── Shape preview + commit ──────────────────────────────────────────────────
  const drawShapePreview = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext("2d")!;
      const rect = overlay.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      applyShape(
        ctx,
        shape,
        start,
        end,
        activeColor,
        size,
        opacity,
        fill,
        true,
      );
    },
    [shape, activeColor, size, opacity, fill],
  );

  const commitShape = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay) return;
      applyShape(
        canvas.getContext("2d")!,
        shape,
        start,
        end,
        activeColor,
        size,
        opacity,
        fill,
        false,
      );
      const rect = overlay.getBoundingClientRect();
      overlay.getContext("2d")!.clearRect(0, 0, rect.width, rect.height);
    },
    [shape, activeColor, size, opacity, fill],
  );

  // ── Pointer events ───────────────────────────────────────────────────────────
  const startDraw = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      e.preventDefault();
      setHasDrawn(true);
      closeTray();
      const p = getPoint(e);
      if (!p) return;
      setIsDrawing(true);
      if (shape !== "none") {
        shapeStart.current = p;
      } else {
        lastPoint.current = p;
      }
    },
    [getPoint, shape, closeTray],
  );

  const moveDraw = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      e.preventDefault();
      if (!isDrawing) return;
      const p = getPoint(e);
      if (!p) return;
      if (shape !== "none" && shapeStart.current) {
        drawShapePreview(shapeStart.current, p);
      } else if (lastPoint.current) {
        drawStroke(lastPoint.current, p);
        lastPoint.current = p;
      }
    },
    [isDrawing, getPoint, shape, drawStroke, drawShapePreview],
  );

  const endDraw = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>,
    ) => {
      if (!isDrawing) return;
      setIsDrawing(false);
      if (shape !== "none" && shapeStart.current) {
        const p = getPoint(e);
        if (p) commitShape(shapeStart.current, p);
        shapeStart.current = null;
      }
      lastPoint.current = null;
      saveToHistory();
    },
    [isDrawing, shape, commitShape, getPoint, saveToHistory],
  );

  // ── Undo ───────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const newIndex = historyIndex - 1;
    ctx.putImageData(history[newIndex], 0, 0);
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  // ── Clear ──────────────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    setHasDrawn(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Reset history
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([imageData]);
    setHistoryIndex(0);
  }, []);

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!hasDrawn) return;

    canvasRef.current?.toBlob(
      (blob) => {
        if (blob && onExport) onExport(blob);
      },
      "image/png",
      1,
    );
  }, [onExport, hasDrawn]);

  // ── Tab toggle ─────────────────────────────────────────────────────────────
  const toggleTab = useCallback((tab: TabType) => {
    setActiveTab((prev) => (prev === tab ? null : tab));
  }, []);

  const currentBrush = BRUSHES.find((b) => b.id === brush)!;
  const currentShape = SHAPES.find((s) => s.id === shape)!;

  return (
    <div className={styles.wrapper}>
      {/* ── Canvas area ────────────────────────────────────────────────────── */}
      <div className={styles.canvasWrap} ref={wrapperRef}>
        <canvas ref={canvasRef} className={styles.canvas} />
        <canvas
          ref={overlayRef}
          className={styles.overlay}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
          style={{
            touchAction: "none",
            cursor:
              shape !== "none"
                ? "crosshair"
                : brush === "eraser"
                  ? "cell"
                  : "crosshair",
          }}
        />
      </div>

      {/* ── Bottom dock + trays ─────────────────────────────────────────────── */}
      <div className={styles.dock}>
        {/* Slide-up tray */}
        {activeTab && (
          <div className={styles.tray}>
            {/* BRUSH tray */}
            {activeTab === "brush" && (
              <div className={styles.trayInner}>
                <div className={styles.trayRow}>
                  {BRUSHES.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={styles.trayBtn}
                      data-active={brush === b.id && shape === "none"}
                      onClick={() => {
                        setBrush(b.id);
                        setShape("none");
                      }}
                      title={b.label}
                    >
                      <span className={styles.trayBtnIcon}>{b.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SHAPE tray */}
            {activeTab === "shape" && (
              <div className={styles.trayInner}>
                <div className={styles.trayTitleRow}>
                  {shape !== "none" && (
                    <label className={styles.fillToggle}>
                      <input
                        type="checkbox"
                        checked={fill}
                        onChange={(e) => setFill(e.target.checked)}
                      />
                      <span>Fill</span>
                    </label>
                  )}
                </div>
                <div className={styles.trayRow}>
                  {SHAPES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={styles.trayBtn}
                      data-active={shape === s.id}
                      onClick={() => setShape(s.id)}
                      title={s.label}
                    >
                      <span className={styles.trayBtnShape}>{s.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* COLOR tray */}
            {activeTab === "color" && (
              <div className={styles.trayInner}>
                <div className={styles.colorGrid}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={styles.colorSwatch}
                      style={{ background: c }}
                      data-selected={color === c}
                      onClick={() => setColor(c)}
                    />
                  ))}
                  <label
                    className={styles.colorSwatch}
                    style={{
                      background:
                        "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",
                    }}
                    data-selected={color === "custom"}
                    title="Custom"
                  >
                    <input
                      type="color"
                      className={styles.hiddenInput}
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        setColor("custom");
                      }}
                    />
                  </label>
                </div>
                <div
                  className={styles.colorPreviewBar}
                  style={{ background: activeColor }}
                />
              </div>
            )}

            {/* SETTINGS tray */}
            {activeTab === "settings" && (
              <div className={styles.trayInner}>
                <div className={styles.sliderRow}>
                  <span className={styles.sliderLabel}>Size</span>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.sliderValue}>{size}</span>
                </div>
                <div className={styles.sliderRow}>
                  <span className={styles.sliderLabel}>Opacity</span>
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className={styles.slider}
                  />
                  <span className={styles.sliderValue}>
                    {Math.round(opacity * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dock bar */}
        <div className={styles.dockBar}>
          <button
            type="button"
            className={styles.dockBtn}
            data-active={activeTab === "brush"}
            onClick={() => toggleTab("brush")}
            title="Brush"
          >
            <span className={styles.dockIcon}>{currentBrush.icon}</span>
          </button>

          <button
            type="button"
            className={styles.dockBtn}
            data-active={activeTab === "shape"}
            onClick={() => toggleTab("shape")}
            title="Shape"
          >
            <span className={styles.dockIcon}>{currentShape.icon}</span>
          </button>

          <button
            type="button"
            className={styles.dockBtn}
            data-active={activeTab === "color"}
            onClick={() => toggleTab("color")}
            title="Color"
          >
            <span
              className={styles.dockColorCircle}
              style={{
                background: activeColor,
                boxShadow:
                  activeTab === "color" ? `0 0 10px ${activeColor}` : "none",
              }}
            />
          </button>

          <button
            type="button"
            className={styles.dockBtn}
            data-active={activeTab === "settings"}
            onClick={() => toggleTab("settings")}
            title="Settings"
          >
            <span className={styles.dockIcon}>⚙️</span>
          </button>

          {/* Divider */}
          <div className={styles.dockDivider} />

          <button
            type="button"
            className={styles.dockClearBtn}
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <span className={styles.dockIcon}>↩️</span>
          </button>

          <button
            type="button"
            className={styles.dockClearBtn}
            onClick={clear}
            title="Clear"
          >
            <span className={styles.dockIcon}>🗑️</span>
          </button>

          <button
            type="button"
            className={styles.dockMintBtn}
            onClick={handleExport}
            disabled={disabled || !hasDrawn}
            title={disabled ? "Minting" : "Mint"}
          >
            <span className={styles.dockIcon}>{disabled ? "⏳" : "🎨"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
