import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, ScanLine } from "lucide-react";
import { api } from "@/lib/api-direct";
import { useToast } from "@/hooks/use-toast";

interface BarcodeScannerProps {
  onResult: (nutrition: any) => void;
}

export function BarcodeScanner({ onResult }: BarcodeScannerProps) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && !scanning) {
      startScanner();
    }
    if (!open) {
      stopScanner();
    }
  }, [open]);

  async function startScanner() {
    try {
      setScanning(true);
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const deviceId = devices[devices.length - 1]?.deviceId;
      if (!videoRef.current) return;
      await reader.decodeFromVideoDevice(deviceId, videoRef.current, async (result, err) => {
        if (result) {
          stopScanner();
          const barcode = result.getText();
          setLoading(true);
          try {
            // Use Open Food Facts API (free, no key needed)
            const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
            const data = await response.json();
            if (data.status === 1 && data.product) {
              const p = data.product;
              const nutriments = p.nutriments || {};
              const nutrition = {
                foodName: p.product_name || p.generic_name || `Product ${barcode}`,
                portionSize: `${p.serving_size || "100g"}`,
                calories: Math.round(nutriments["energy-kcal_100g"] || nutriments["energy-kcal"] || 0),
                proteinGrams: nutriments.proteins_100g || 0,
                carbsGrams: nutriments.carbohydrates_100g || 0,
                fatGrams: nutriments.fat_100g || 0,
                fiberGrams: nutriments.fiber_100g || 0,
                healthScore: Math.min(10, Math.max(1, Math.round(10 - (nutriments.sugars_100g || 0) / 5))),
                alternatives: [],
                tips: p.categories ? `Category: ${p.categories.split(",")[0]}` : "Scanned via barcode.",
              };
              onResult(nutrition);
              setOpen(false);
              toast({ title: "Product found!", description: `${nutrition.foodName} scanned successfully.` });
            } else {
              toast({ variant: "destructive", title: "Product not found", description: "No nutritional data found for this barcode. Try searching manually." });
            }
          } catch {
            toast({ variant: "destructive", title: "Scan failed", description: "Could not fetch nutrition data." });
          } finally {
            setLoading(false);
          }
        }
      });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Camera Error", description: "Could not access camera. Please allow camera permissions." });
      setOpen(false);
    }
  }

  function stopScanner() {
    readerRef.current?.reset();
    setScanning(false);
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Camera className="w-4 h-4" /> Scan Barcode
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) stopScanner(); setOpen(v); }}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2"><ScanLine className="w-5 h-5" /> Scan Food Barcode</DialogTitle>
          </DialogHeader>
          <div className="relative bg-black">
            <video ref={videoRef} className="w-full aspect-square object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/80 rounded-xl">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
              </div>
            </div>
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm">Fetching nutrition data...</p>
                </div>
              </div>
            )}
          </div>
          <div className="p-4">
            <p className="text-sm text-muted-foreground text-center">Point your camera at a food product barcode</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
