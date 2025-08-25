import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react';

const SealCropInterface = ({ imageFile, onCropComplete, onCancel }) => {
  const canvasRef = useRef(null);
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Crop dimensions: 300x200 at 300 DPI
  const CROP_WIDTH = 300;
  const CROP_HEIGHT = 200;
  const CANVAS_WIDTH = 600;
  const CANVAS_HEIGHT = 400;

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
    const cropDisplayWidth = CROP_WIDTH * 0.5; // Scale for display
    const cropDisplayHeight = CROP_HEIGHT * 0.5;
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
    setScale(prev => Math.min(prev * 1.2, 5));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
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
    const displayRatio = 0.5;
    const cropDisplayWidth = CROP_WIDTH * displayRatio;
    const cropDisplayHeight = CROP_HEIGHT * displayRatio;
    const cropX = (CANVAS_WIDTH - cropDisplayWidth) / 2;
    const cropY = (CANVAS_HEIGHT - cropDisplayHeight) / 2;

    // Calculate source position on the actual image
    const sourceX = (cropX - position.x) / scale;
    const sourceY = (cropY - position.y) / scale;
    const sourceWidth = cropDisplayWidth / scale / displayRatio;
    const sourceHeight = cropDisplayHeight / scale / displayRatio;

    // Draw cropped portion
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, CROP_WIDTH, CROP_HEIGHT
    );

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
      }
    }, 'image/png', 1.0);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Crop Seal - 300x200px</CardTitle>
        <p className="text-sm text-muted-foreground">
          Position and scale your seal within the blue rectangle. Use mouse to drag and buttons to zoom.
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
  );
};

export default SealCropInterface;
