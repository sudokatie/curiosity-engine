import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function GraphControls({ onZoomIn, onZoomOut, onFit }: GraphControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-20">
      <button 
        onClick={onZoomIn} 
        title="Zoom in"
        className="p-2 bg-panel border border-border text-muted hover:text-text hover:border-border-strong transition-colors"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button 
        onClick={onZoomOut} 
        title="Zoom out"
        className="p-2 bg-panel border border-border text-muted hover:text-text hover:border-border-strong transition-colors"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <div className="dotted-separator my-1" />
      <button 
        onClick={onFit} 
        title="Fit to view"
        className="p-2 bg-panel border border-border text-muted hover:text-text-cream hover:border-text-cream transition-colors"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
}
