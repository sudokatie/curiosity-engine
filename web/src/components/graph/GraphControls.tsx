import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function GraphControls({ onZoomIn, onZoomOut, onFit }: GraphControlsProps) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1">
      <Button variant="secondary" size="sm" onClick={onZoomIn} title="Zoom in">
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button variant="secondary" size="sm" onClick={onZoomOut} title="Zoom out">
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button variant="secondary" size="sm" onClick={onFit} title="Fit to view">
        <Maximize2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
