import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Plus, Minus } from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
    baseWidth: number;
    baseHeight: number;
  }>({ width: 0, height: 0, baseWidth: 0, baseHeight: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const CROP_SIZE = 280; // Size of circular viewport in pixels

  // Clamps position so the image never leaves the circular viewport bounds (no empty space inside circle)
  const clampPosition = (
    x: number,
    y: number,
    currScale: number,
    baseW: number,
    baseH: number
  ) => {
    const currentBaseW = baseW || CROP_SIZE;
    const currentBaseH = baseH || CROP_SIZE;
    const scaledWidth = currentBaseW * currScale;
    const scaledHeight = currentBaseH * currScale;

    const maxX = Math.max(0, (scaledWidth - CROP_SIZE) / 2);
    const minX = -maxX;
    const maxY = Math.max(0, (scaledHeight - CROP_SIZE) / 2);
    const minY = -maxY;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  };

  // On Image load, set base size
  const handleImageLoad = () => {
    if (!imageRef.current) return;
    const naturalWidth = imageRef.current.naturalWidth || 300;
    const naturalHeight = imageRef.current.naturalHeight || 300;

    // Minimum scale to match viewport
    const baseScale = Math.max(CROP_SIZE / naturalWidth, CROP_SIZE / naturalHeight);
    const baseWidth = naturalWidth * baseScale;
    const baseHeight = naturalHeight * baseScale;

    setImageDimensions({
      width: naturalWidth,
      height: naturalHeight,
      baseWidth,
      baseHeight,
    });
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Reset when imageSrc changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [imageSrc]);

  // Mouse drag handlers with boundary clamping
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    setPosition(
      clampPosition(
        rawX,
        rawY,
        scale,
        imageDimensions.baseWidth,
        imageDimensions.baseHeight
      )
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag & pinch-to-zoom handlers for mobile devices
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      };
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const rawX = touch.clientX - touchStartRef.current.x;
      const rawY = touch.clientY - touchStartRef.current.y;
      setPosition(
        clampPosition(
          rawX,
          rawY,
          scale,
          imageDimensions.baseWidth,
          imageDimensions.baseHeight
        )
      );
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartRef.current.dist;
      const newScale = Math.min(4, Math.max(1, scale * factor));
      setScale(newScale);
      setPosition((prev) =>
        clampPosition(
          prev.x,
          prev.y,
          newScale,
          imageDimensions.baseWidth,
          imageDimensions.baseHeight
        )
      );
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current.dist = undefined;
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    const newScale = Math.min(4, Math.max(1, scale + zoomDelta));
    setScale(newScale);
    setPosition((prev) =>
      clampPosition(
        prev.x,
        prev.y,
        newScale,
        imageDimensions.baseWidth,
        imageDimensions.baseHeight
      )
    );
  };

  // Zoom control helper
  const handleZoomChange = (newScale: number) => {
    const clampedScale = Math.min(4, Math.max(1, newScale));
    setScale(clampedScale);
    setPosition((prev) =>
      clampPosition(
        prev.x,
        prev.y,
        clampedScale,
        imageDimensions.baseWidth,
        imageDimensions.baseHeight
      )
    );
  };

  // Canvas Crop & Export
  const handleSaveCrop = useCallback(() => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    const OUTPUT_SIZE = 512; // High resolution square export
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // High quality anti-aliased rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Circular clipping path
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    // Map viewport coordinates to canvas
    const ratio = OUTPUT_SIZE / CROP_SIZE;
    const drawWidth = (imageDimensions.baseWidth || CROP_SIZE) * ratio * scale;
    const drawHeight = (imageDimensions.baseHeight || CROP_SIZE) * ratio * scale;

    ctx.save();
    // Center of canvas
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
    // Apply position offset freely
    ctx.translate(position.x * ratio, position.y * ratio);

    // Draw the image exactly
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Export as PNG
    const croppedDataUrl = canvas.toDataURL('image/png', 0.95);
    onCropComplete(croppedDataUrl);
  }, [position, scale, imageDimensions, onCropComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between select-none animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80 bg-black/90 z-20">
        <button
          type="button"
          onClick={onCancel}
          className="text-neutral-400 hover:text-white p-2 -ml-2 rounded-full active:bg-neutral-800 transition-colors"
          title="Cancel"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-base sm:text-lg font-medium text-white tracking-wide">
          Crop Photo
        </h2>

        {/* Placeholder for symmetrical spacing */}
        <div className="w-8" />
      </div>

      {/* Main Viewport with Circular Mask & Grid */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className="relative flex-1 flex items-center justify-center overflow-hidden bg-[#0a0a0a] cursor-grab active:cursor-grabbing touch-none"
      >
        {/* The Image being transformed (Free position & zoom) */}
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.05s ease-out',
            width: imageDimensions.baseWidth ? `${imageDimensions.baseWidth}px` : 'auto',
            height: imageDimensions.baseHeight ? `${imageDimensions.baseHeight}px` : 'auto',
          }}
          className="pointer-events-none flex items-center justify-center max-w-none select-none"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            onLoad={handleImageLoad}
            alt="Crop target"
            style={{
              width: imageDimensions.baseWidth ? `${imageDimensions.baseWidth}px` : undefined,
              height: imageDimensions.baseHeight ? `${imageDimensions.baseHeight}px` : undefined,
              maxWidth: 'none',
              maxHeight: 'none',
            }}
            className="object-cover select-none"
            draggable={false}
          />
        </div>

        {/* Circular Mask & 3x3 Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Dark Overlay around Circle */}
          <div
            style={{
              width: `${CROP_SIZE}px`,
              height: `${CROP_SIZE}px`,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
            }}
            className="rounded-full border-2 border-white/90 relative overflow-hidden flex items-center justify-center"
          >
            {/* 3x3 Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              <div className="border-r border-b border-white/30" />
              <div className="border-r border-b border-white/30" />
              <div className="border-b border-white/30" />
              <div className="border-r border-b border-white/30" />
              <div className="border-r border-b border-white/30" />
              <div className="border-b border-white/30" />
              <div className="border-r border-b border-white/30" />
              <div className="border-r border-b border-white/30" />
              <div />
            </div>
          </div>
        </div>

        {/* Floating guidance label */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs text-neutral-300 pointer-events-none border border-neutral-700/50">
          Drag to move &bull; Pinch or slider to zoom
        </div>
      </div>

      {/* Bottom Controls Area (Zoom Slider + Cancel & Done) */}
      <div className="bg-black/95 border-t border-neutral-800/80 px-6 py-4 z-20 space-y-3.5">
        {/* Zoom In & Zoom Out Slider */}
        <div className="max-w-xs sm:max-w-sm mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleZoomChange(scale - 0.15)}
            className="text-neutral-400 hover:text-white p-1.5 rounded-full active:bg-neutral-800 transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>

          <input
            type="range"
            min="1"
            max="3.5"
            step="0.05"
            value={scale}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          <button
            type="button"
            onClick={() => handleZoomChange(scale + 0.15)}
            className="text-neutral-400 hover:text-white p-1.5 rounded-full active:bg-neutral-800 transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>

          <span className="text-xs font-semibold text-emerald-400 w-10 text-right">
            {scale.toFixed(1)}x
          </span>
        </div>

        {/* Actions: Cancel & Done */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-neutral-300 hover:text-white py-2 px-4 rounded-xl active:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveCrop}
            className="bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-semibold text-sm py-2.5 px-6 rounded-full transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4 text-black stroke-[2.5]" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
