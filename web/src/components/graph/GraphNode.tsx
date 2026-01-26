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

const typeColors = {
  seed: '#3b82f6',
  thread: '#737373',
  discovery: '#eab308',
};

const typeShapes = {
  seed: 'rect',
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
      {/* Selection ring */}
      {isSelected && (
        <circle
          r={size + 6}
          fill="none"
          stroke={color}
          strokeWidth={2}
          opacity={0.6}
        />
      )}

      {/* Node shape */}
      {shape === 'rect' && (
        <rect
          x={-size}
          y={-size}
          width={size * 2}
          height={size * 2}
          fill={color}
          rx={2}
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

      {/* Label */}
      <text
        y={size + 14}
        textAnchor="middle"
        fill="#fafafa"
        fontSize={10}
        className="pointer-events-none select-none"
      >
        {node.label.slice(0, 20)}
        {node.label.length > 20 ? '...' : ''}
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
