import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PenTool, RotateCcw } from "lucide-react";

interface SignatureCaptureProps {
    label: string;
    onCapture: (dataUrl: string) => void;
    value?: string;
    disabled?: boolean;
}

export function SignatureCapture({ label, onCapture, value, disabled = false }: SignatureCaptureProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(!!value);

    useEffect(() => {
        if (value && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = value;
            setHasSignature(true);
        }
    }, [value]);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        const rect = canvas.getBoundingClientRect();
        if ("touches" in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: (e as React.MouseEvent).clientX - rect.left,
            y: (e as React.MouseEvent).clientY - rect.top,
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const pos = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || disabled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const pos = getPos(e, canvas);
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL("image/png");
        setHasSignature(true);
        onCapture(dataUrl);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onCapture("");
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                    <PenTool className="h-4 w-4" />
                    {label}
                </Label>
                {hasSignature && !disabled && (
                    <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 text-xs text-muted-foreground">
                        <RotateCcw className="h-3 w-3 mr-1" /> Clear
                    </Button>
                )}
            </div>
            <div
                className={`border-2 rounded-lg overflow-hidden bg-white ${
                    disabled ? "opacity-60 cursor-not-allowed" : "cursor-crosshair border-dashed hover:border-primary"
                } ${hasSignature ? "border-green-400" : ""}`}
            >
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full h-[150px] touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    data-testid={`signature-canvas-${label.toLowerCase().replace(/\s+/g, "-")}`}
                />
            </div>
            {!hasSignature && !disabled && (
                <p className="text-xs text-muted-foreground">Sign in the box above</p>
            )}
        </div>
    );
}
