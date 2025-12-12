import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react';

const LetterheadCropInterface = ({ imageFile, onCropComplete, onCancel }) => {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Crop dimensions for A4 at 300 DPI (print quality)
  // A4 width = 8.27 inches × 300 DPI = 2480 pixels
  // Letterhead height = 2.5 inches × 300 DPI = 750 pixels
  const CROP_WIDTH = 2480;
  const CROP_HEIGHT = 750;
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 300;

  // Display ratio to fit crop area in canvas (2480 * 0.2 = 496px fits in 600px canvas)
  const DISPLAY_RATIO = 0.2;

  useEffect(() => {
    if (imageFile) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        // Calculate initial scale to fit crop area
        const scaleX = CROP_WIDTH / img.width;
        const scaleY = CROP_HEIGHT / img.height;
        const initialScale = Math.max(scaleX, scaleY) * 0.8;
        setScale(initialScale);
        
        // Center the image
        setPosition({
          x: (CANVAS_WIDTH - img.width * initialScale) / 2,
          y: (CANVAS_HEIGHT - img.height * initialScale) / 2
        });
      };
      img.src = URL.createObjectURL(imageFile);
    }
  }, [imageFile]);

  useEffect(() => {
    if (image && canvasRef.current) {
      drawCanvas();
    }
  }, [image, scale, position]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw image
    ctx.drawImage(
      image,
      position.x,
      position.y,
      image.width * scale,
      image.height * scale
    );
    
    // Draw crop overlay
    drawCropOverlay(ctx);
  };

  const drawCropOverlay = (ctx) => {
    const cropDisplayWidth = CROP_WIDTH * DISPLAY_RATIO; // Scale for display
    const cropDisplayHeight = CROP_HEIGHT * DISPLAY_RATIO;
    const cropX = (CANVAS_WIDTH - cropDisplayWidth) / 2;
    const cropY = (CANVAS_HEIGHT - cropDisplayHeight) / 2;

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Clear crop area
    ctx.clearRect(cropX, cropY, cropDisplayWidth, cropDisplayHeight);
    
    // Redraw image in crop area only
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropX, cropY, cropDisplayWidth, cropDisplayHeight);
    ctx.clip();
    
    ctx.drawImage(
      image,
      position.x,
      position.y,
      image.width * scale,
      image.height * scale
    );
    ctx.restore();
    
    // Crop area border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropX, cropY, cropDisplayWidth, cropDisplayHeight);
    
    // Guidelines
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(cropX + cropDisplayWidth / 3, cropY);
    ctx.lineTo(cropX + cropDisplayWidth / 3, cropY + cropDisplayHeight);
    ctx.moveTo(cropX + (cropDisplayWidth * 2) / 3, cropY);
    ctx.lineTo(cropX + (cropDisplayWidth * 2) / 3, cropY + cropDisplayHeight);
    
    // Horizontal lines
    ctx.moveTo(cropX, cropY + cropDisplayHeight / 3);
    ctx.lineTo(cropX + cropDisplayWidth, cropY + cropDisplayHeight / 3);
    ctx.moveTo(cropX, cropY + (cropDisplayHeight * 2) / 3);
    ctx.lineTo(cropX + cropDisplayWidth, cropY + (cropDisplayHeight * 2) / 3);
    ctx.stroke();
    
    ctx.setLineDash([]);
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - rect.left - position.x,
      y: e.clientY - rect.top - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left - dragStart.x,
      y: e.clientY - rect.top - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const zoomIn = () => {
    const newScale = scale * 1.2;
    // Calculate center of canvas
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    // Adjust position to keep center point stable
    const newX = centerX - (centerX - position.x) * (newScale / scale);
    const newY = centerY - (centerY - position.y) * (newScale / scale);
    setScale(newScale);
    setPosition({ x: newX, y: newY });
  };

  const zoomOut = () => {
    const newScale = scale / 1.2;
    // Calculate center of canvas
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    // Adjust position to keep center point stable
    const newX = centerX - (centerX - position.x) * (newScale / scale);
    const newY = centerY - (centerY - position.y) * (newScale / scale);
    setScale(newScale);
    setPosition({ x: newX, y: newY });
  };

  const resetView = () => {
    if (image) {
      const scaleX = CROP_WIDTH / image.width;
      const scaleY = CROP_HEIGHT / image.height;
      const initialScale = Math.max(scaleX, scaleY) * 0.8;
      setScale(initialScale);
      setPosition({
        x: (CANVAS_WIDTH - image.width * initialScale) / 2,
        y: (CANVAS_HEIGHT - image.height * initialScale) / 2
      });
    }
  };

  const handleCrop = async () => {
    if (!image) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = CROP_WIDTH;
    canvas.height = CROP_HEIGHT;

    // Calculate actual crop position
    const cropDisplayWidth = CROP_WIDTH * DISPLAY_RATIO;
    const cropDisplayHeight = CROP_HEIGHT * DISPLAY_RATIO;
    const cropX = (CANVAS_WIDTH - cropDisplayWidth) / 2;
    const cropY = (CANVAS_HEIGHT - cropDisplayHeight) / 2;

    // Calculate source position on the actual image
    const sourceX = (cropX - position.x) / scale;
    const sourceY = (cropY - position.y) / scale;
    const sourceWidth = cropDisplayWidth / scale / DISPLAY_RATIO;
    const sourceHeight = cropDisplayHeight / scale / DISPLAY_RATIO;

    // Draw cropped portion
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, CROP_WIDTH, CROP_HEIGHT
    );

   // Convert to base64 data URL
    const base64Data = canvas.toDataURL('image/png', 1.0);
    onCropComplete(base64Data);
  };

return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <Card className="w-full max-w-2xl mx-4 bg-background">
        <CardHeader>
          <CardTitle className="text-lg">Crop Letterhead - A4 Width (300 DPI)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Position and scale your letterhead within the blue rectangle. Output: 2480×750px (full A4 width at 300 DPI, ~2.5" tall)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border rounded cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
          
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleCrop}>
              <Check className="h-4 w-4 mr-2" />
              Crop & Upload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LetterheadCropInterface;
