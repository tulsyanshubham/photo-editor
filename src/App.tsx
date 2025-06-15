"use client";

import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

type FilterSettings = {
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  hue: number;
  blur: number;
  transparency: number;
  grayscale: boolean;
};

type CropSettings = {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: string | null;
  isMoving: boolean;
  moveStart: { x: number; y: number };
};

export default function PhotoEditor() {
  const { theme, setTheme } = useTheme();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    brightness: 100,
    contrast: 0,
    saturation: 100,
    temperature: 0,
    hue: 0,
    blur: 0,
    transparency: 100,
    grayscale: false,
  });
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    aspectRatio: null,
    isMoving: false,
    moveStart: { x: 0, y: 0 },
  });
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [compressionQuality, setCompressionQuality] = useState(100);
  const [activeTab, setActiveTab] = useState("filters");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (originalImage && imageRef.current) {
      const updateCanvasSize = () => {
        if (imageRef.current && canvasRef.current) {
          canvasRef.current.width = imageRef.current.clientWidth;
          canvasRef.current.height = imageRef.current.clientHeight;
          applyFilters();
        }
      };

      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);
      return () => window.removeEventListener('resize', updateCanvasSize);
    }
  }, [originalImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setOriginalImage(result);

        // ✅ Reset crop to full image when new image is loaded
        setCropSettings({
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          aspectRatio: null,
          isMoving: false,
          moveStart: { x: 0, y: 0 },
        });


        setIsCropping(false); // Optional: reset cropping state
      }
    };
    reader.readAsDataURL(file);
  };

  const applyFilters = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;

    const {
      x,
      y,
      width,
      height,
    } = cropSettings;

    // Convert percentage-based crop settings to actual pixel dimensions
    const cropX = img.naturalWidth * (x / 100);
    const cropY = img.naturalHeight * (y / 100);
    const cropW = img.naturalWidth * (width / 100);
    const cropH = img.naturalHeight * (height / 100);

    // Resize the canvas to match cropped image size
    canvas.width = cropW;
    canvas.height = cropH;

    // Construct CSS filter string
    const sepia = filterSettings.temperature > 0 ? `${filterSettings.temperature}%` : "0%";
    const warmth = filterSettings.temperature < 0 ? `brightness(${100 + filterSettings.temperature}%)` : "";

    ctx.filter = `
    brightness(${filterSettings.brightness}%)
    contrast(${100 + filterSettings.contrast}%)
    saturate(${filterSettings.saturation}%)
    sepia(${sepia})
    hue-rotate(${filterSettings.hue}deg)
    ${warmth}
    ${filterSettings.grayscale ? "grayscale(100%)" : ""}
  `.trim();

    // Apply transparency
    ctx.globalAlpha = filterSettings.transparency / 100;

    // Draw cropped image with applied filters
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Optionally apply additional blur
    if (filterSettings.blur > 0) {
      applyQualityBlur(canvas, filterSettings.blur); // Make sure this is defined
    }

    // Reset globalAlpha and filter after draw (optional for safety)
    ctx.globalAlpha = 1.0;
    ctx.filter = "none";
  };

  function applyQualityBlur(canvas: HTMLCanvasElement, blurAmount: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create an offscreen canvas to hold the original content
    const offCanvas = document.createElement("canvas");
    offCanvas.width = canvas.width;
    offCanvas.height = canvas.height;

    const offCtx = offCanvas.getContext("2d");
    if (!offCtx) return;

    // Copy the current canvas content to the offscreen canvas
    offCtx.drawImage(canvas, 0, 0);

    // Apply blur filter and redraw from offscreen canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `blur(${blurAmount}px)`;
    ctx.drawImage(offCanvas, 0, 0);

    // Clean up filter
    ctx.filter = "none";
  }

  const startCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setCropStart({ x, y });
    setCropSettings((prev) => ({
      ...prev,
      x,
      y,
      width: 0,
      height: 0,
      aspectRatio: null,
      isMoving: false,
    }));
  };

  const updateCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping || !imageRef.current || (cropSettings.width === 0 && cropSettings.height === 0 && !cropSettings.aspectRatio)) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (cropSettings.aspectRatio) {
      if (cropSettings.isMoving) {
        const deltaX = x - cropSettings.moveStart.x;
        const deltaY = y - cropSettings.moveStart.y;

        setCropSettings((prev) => ({
          ...prev,
          x: Math.max(0, Math.min(100 - prev.width, prev.x + deltaX)),
          y: Math.max(0, Math.min(100 - prev.height, prev.y + deltaY)),
          moveStart: { x, y },
        }));
      }
    } else {
      const width = x - cropStart.x;
      const height = y - cropStart.y;

      setCropSettings((prev) => ({
        ...prev,
        width: Math.abs(width),
        height: Math.abs(height),
        x: width < 0 ? x : prev.x,
        y: height < 0 ? y : prev.y,
      }));
    }
  };

  const startMovingCrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping || !imageRef.current || !cropSettings.aspectRatio) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setCropSettings((prev) => ({
      ...prev,
      isMoving: true,
      moveStart: { x, y },
    }));
  };

  const stopMovingCrop = () => {
    setCropSettings((prev) => ({
      ...prev,
      isMoving: false,
    }));
  };

  const applyPresetCrop = (aspectRatio: string) => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    // parse aspect ratio
    const [wStr, hStr] = aspectRatio.split("/");
    const targetRatio = parseFloat(wStr) / parseFloat(hStr);

    let cropWpx: number;
    let cropHpx: number;

    // decide whether to base on image width or height
    if (imgW / imgH > targetRatio) {
      // image is wider than target ratio → limit by height
      cropHpx = imgH;
      cropWpx = cropHpx * targetRatio;
    } else {
      // image is taller (or equal) than target ratio → limit by width
      cropWpx = imgW;
      cropHpx = cropWpx / targetRatio;
    }

    // convert back to percentages for your cropSettings state
    const widthPct = (cropWpx / imgW) * 100;
    const heightPct = (cropHpx / imgH) * 100;

    // center the crop box
    const xPct = ((imgW - cropWpx) / 2 / imgW) * 100;
    const yPct = ((imgH - cropHpx) / 2 / imgH) * 100;

    setCropSettings({
      x: xPct,
      y: yPct,
      width: widthPct,
      height: heightPct,
      aspectRatio,
      isMoving: false,
      moveStart: { x: 0, y: 0 },
    });

    setIsCropping(true);
  };


  const resetFilters = () => {
    setFilterSettings({
      brightness: 100,
      contrast: 0,
      saturation: 100,
      temperature: 0,
      hue: 0,
      blur: 0,
      transparency: 100,
      grayscale: false,
    });
  };

  const downloadImage = () => {
    if (!canvasRef.current || !originalImage) return;

    // Create a temporary canvas for download with higher resolution
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const img = new Image();
    img.onload = () => {
      // Apply crop dimensions
      const cropWidth = img.width * (cropSettings.width / 100);
      const cropHeight = img.height * (cropSettings.height / 100);

      tempCanvas.width = cropWidth;
      tempCanvas.height = cropHeight;

      // Apply crop coordinates
      const sx = img.width * (cropSettings.x / 100);
      const sy = img.height * (cropSettings.y / 100);
      const sWidth = img.width * (cropSettings.width / 100);
      const sHeight = img.height * (cropSettings.height / 100);

      // Apply all filters
      tempCtx.filter = `
        brightness(${filterSettings.brightness}%)
        contrast(${100 + filterSettings.contrast}%)
        saturate(${filterSettings.saturation}%)
        sepia(${Math.max(0, filterSettings.temperature)}%)
        hue-rotate(${filterSettings.hue}deg)
        ${filterSettings.grayscale ? "grayscale(100%)" : ""}
      `;
      tempCtx.globalAlpha = filterSettings.transparency / 100;

      // Draw the edited image
      tempCtx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, cropWidth, cropHeight);

      // Apply blur
      if (filterSettings.blur > 0) {
        applyQualityBlur(tempCanvas, filterSettings.blur);
      }

      // Download the image
      tempCanvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'edited-photo.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/jpeg', compressionQuality / 100);
    };
    img.src = originalImage;
    resetFilters();
  };

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  useEffect(() => {
    if (!isCropping && originalImage) {
      applyFilters(); // apply crop and filters to canvas
    }
  }, [isCropping]);

  useEffect(() => {
    if (originalImage) {
      applyFilters();
    }
  }, [filterSettings, cropSettings, compressionQuality, originalImage]);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold dark:text-white">Photo Editor</h1>
        <Button variant="outline" size="icon" onClick={toggleDarkMode}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <div className="border rounded-lg overflow-hidden relative dark:border-gray-700">
            {!originalImage ? (
              <div className="flex items-center justify-center h-96 bg-gray-100 dark:bg-gray-800">
                <label className="cursor-pointer p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            ) : (
              <div
                className="relative"
                ref={containerRef}
                onMouseDown={activeTab === "crop" && isCropping ? (cropSettings.aspectRatio ? startMovingCrop : startCrop) : undefined}
                onMouseMove={activeTab === "crop" && isCropping ? updateCrop : undefined}
                onMouseUp={activeTab === "crop" && isCropping ? stopMovingCrop : undefined}
                onMouseLeave={activeTab === "crop" && isCropping ? stopMovingCrop : undefined}
              >
                <img
                  ref={imageRef}
                  src={originalImage!}
                  alt="Original"
                  className="max-w-full h-auto absolute opacity-0 select-none"
                  onLoad={() => {
                    if (!canvasRef.current || !imageRef.current) return;
                    const img = imageRef.current;
                    const canvas = canvasRef.current;
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;

                    applyFilters();
                  }}
                />

                <canvas
                  ref={canvasRef}
                  className="block max-w-full rounded"
                  style={{ width: "auto", height: "auto" }}
                />

                {activeTab === "crop" && isCropping && (
                  <div
                    className={`absolute border-2 border-gray-900 dark:border-gray-300 z-100 bg-gray-400/20 bg-opacity-10 rounded-lg pointer-events-none
                      ${cropSettings.aspectRatio ? 'cursor-move' : ''}`}
                    style={{
                      left: `${cropSettings.x}%`,
                      top: `${cropSettings.y}%`,
                      width: `${cropSettings.width}%`,
                      height: `${cropSettings.height}%`,
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-80 space-y-6">
          <Tabs
            defaultValue="filters"
            className="w-full"
            onValueChange={(value) => setActiveTab(value)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="crop">Crop</TabsTrigger>
            </TabsList>

            <TabsContent value="filters" className="space-y-4">
              <div>
                <label className="block mb-2 dark:text-gray-300">Brightness: {filterSettings.brightness}%</label>
                <Slider
                  value={[filterSettings.brightness]}
                  onValueChange={(value) => setFilterSettings({ ...filterSettings, brightness: value[0] })}
                  min={0}
                  max={200}
                  step={1}
                />
              </div>

              <div>
                <label className="block mb-2 dark:text-gray-300">Contrast: {filterSettings.contrast}</label>
                <Slider
                  value={[filterSettings.contrast]}
                  onValueChange={(value) => setFilterSettings({ ...filterSettings, contrast: value[0] })}
                  min={-50}
                  max={50}
                  step={1}
                />
              </div>

              <div>
                <label className="block mb-2 dark:text-gray-300">Saturation: {filterSettings.saturation}%</label>
                <Slider
                  value={[filterSettings.saturation]}
                  onValueChange={(value) => setFilterSettings({ ...filterSettings, saturation: value[0] })}
                  min={0}
                  max={200}
                  step={1}
                />
              </div>

              <div>
                <label className="block mb-2 dark:text-gray-300">Temperature: {filterSettings.temperature}</label>
                <Slider
                  value={[filterSettings.temperature]}
                  onValueChange={(value) => setFilterSettings({ ...filterSettings, temperature: value[0] })}
                  min={-100}
                  max={100}
                  step={1}
                />
              </div>

              <div>
                <label className="block mb-2 dark:text-gray-300">Hue: {filterSettings.hue}deg</label>
                <Slider
                  value={[filterSettings.hue]}
                  onValueChange={(value) => setFilterSettings({ ...filterSettings, hue: value[0] })}
                  min={-180}
                  max={180}
                  step={1}
                />
              </div>

              <div>
                <label className="block mb-2 dark:text-gray-300">Blur: {filterSettings.blur}px</label>
                <Slider
                  value={[filterSettings.blur]}
                  onValueChange={(value) => setFilterSettings({ ...filterSettings, blur: value[0] })}
                  min={0}
                  max={20}
                  step={0.5}
                />
              </div>

              <div>
                <label className="block mb-2 dark:text-gray-300">Transparency: {filterSettings.transparency}%</label>
                <Slider
                  value={[filterSettings.transparency]}
                  onValueChange={(value) => setFilterSettings({ ...filterSettings, transparency: value[0] })}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              <div>
                <label className="block mb-2 dark:text-gray-300">Compression: {compressionQuality}%</label>
                <Slider
                  value={[compressionQuality]}
                  onValueChange={(value) => setCompressionQuality(value[0])}
                  min={10}
                  max={100}
                  step={1}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filterSettings.grayscale ? "default" : "outline"}
                  onClick={() => setFilterSettings({ ...filterSettings, grayscale: !filterSettings.grayscale })}
                >
                  B&W
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  Reset
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="crop" className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => applyPresetCrop("1/1")}>
                    Square (1:1)
                  </Button>
                  <Button variant="outline" onClick={() => applyPresetCrop("4/3")}>
                    Standard (4:3)
                  </Button>
                  <Button variant="outline" onClick={() => applyPresetCrop("16/9")}>
                    Widescreen (16:9)
                  </Button>
                  <Button variant="outline" onClick={() => applyPresetCrop("3/4")}>
                    Portrait (3:4)
                  </Button>
                  <Button variant="outline" onClick={() => applyPresetCrop("2/3")}>
                    Classic (2:3)
                  </Button>
                  <Button variant="outline" onClick={() => applyPresetCrop("9/16")}>
                    Vertical Video (9:16)
                  </Button>
                  <Button variant="outline" onClick={() => applyPresetCrop("5/4")}>
                    5:4 Ratio
                  </Button>
                  <Button variant="outline" onClick={() => applyPresetCrop("21/9")}>
                    Ultrawide (21:9)
                  </Button>
                </div>

                <Button
                  variant={isCropping ? "default" : "outline"}
                  onClick={() => setIsCropping(false)}
                  disabled={!isCropping}
                >
                  Finish Crop
                </Button>
              </div>



              {isCropping && (
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {cropSettings.aspectRatio
                      ? "Click and drag the crop area to position it"
                      : "Click and drag on the image to select crop area"}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button
              onClick={downloadImage}
              disabled={!originalImage || isCropping}
              className="w-full"
            >
              Download Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}