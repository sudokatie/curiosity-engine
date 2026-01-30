import { useRef, useCallback } from 'react';
import type { GraphNode as GraphNodeType } from '../../types';

interface GraphNodeProps {
  node: GraphNodeType & { x: number; y: number };
  isSelected: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onDrag: (x: number, y: number) => void;
  onDragEnd: () => void;
}

// Dispatch-inspired colors
const typeColors = {
  seed: '#e85a3c',      // coral accent
  thread: '#6b6b5a',    // muted olive
  discovery: '#e8d5a8', // cream
};

const typeShapes = {
  seed: 'diamond',      // diamond for seeds (like Dispatch logo)
  thread: 'circle',
  discovery: 'star',
} as const;

function getNodeSize(score: number, type: string): number {
  const baseSize = type === 'discovery' ? 12 : 8;
  return baseSize + score * 8;
}

export function GraphNode({
  node,
  isSelected,
  onClick,
  onDragStart,
  onDrag,
  onDragEnd,
}: GraphNodeProps) {
  const isDragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      isDragging.current = false;
      onDragStart();

      const startX = e.clientX;
      const startY = e.clientY;

      const handleMouseMove = (e: MouseEvent) => {
        isDragging.current = true;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        onDrag(node.x + dx, node.y + dy);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        onDragEnd();

        if (!isDragging.current) {
          onClick();
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [node.x, node.y, onClick, onDragStart, onDrag, onDragEnd]
  );

  const size = getNodeSize(node.score, node.type);
  const color = typeColors[node.type];
  const shape = typeShapes[node.type];

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={handleMouseDown}
      className="cursor-pointer"
    >
      {/* Selection ring - dotted style */}
      {isSelected && (
        <circle
          r={size + 8}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="4 2"
          opacity={0.8}
        />
      )}

      {/* Node shape */}
      {shape === 'diamond' && (
        <rect
          x={-size}
          y={-size}
          width={size * 2}
          height={size * 2}
          fill={color}
          transform="rotate(45)"
        />
      )}
      {shape === 'circle' && (
        <circle r={size} fill={color} />
      )}
      {shape === 'star' && (
        <polygon
          points={createStarPoints(size)}
          fill={color}
        />
      )}

      {/* Label - monospace style */}
      <text
        y={size + 16}
        textAnchor="middle"
        fill="#fafafa"
        fontSize={10}
        fontFamily="JetBrains Mono, monospace"
        className="pointer-events-none select-none"
      >
        {node.label.slice(0, 18)}
        {node.label.length > 18 ? '...' : ''}
      </text>
    </g>
  );
}

function createStarPoints(size: number): string {
  const points: string[] = [];
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.5;

  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    points.push(`${Math.cos(angle) * radius},${Math.sin(angle) * radius}`);
  }

  return points.join(' ');
}
