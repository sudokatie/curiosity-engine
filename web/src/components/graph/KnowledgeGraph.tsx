import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useGraph } from '../../api/graph';
import { useUIStore } from '../../store/ui';
import { useGraphSimulation } from '../../hooks/useGraphSimulation';
import { GraphNode } from './GraphNode';
import { GraphControls } from './GraphControls';

export function KnowledgeGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [, forceUpdate] = useState(0);

  const { data, isLoading, error } = useGraph();
  const { selectedNodeId, selectNode, searchQuery } = useUIStore();

  // Filter nodes based on search
  const filteredData = useMemo(() => {
    if (!data || !searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase();
    const matchingNodeIds = new Set(
      data.nodes
        .filter(n => n.label.toLowerCase().includes(query))
        .map(n => n.id)
    );
    
    return {
      nodes: data.nodes.filter(n => matchingNodeIds.has(n.id)),
      edges: data.edges.filter(e => 
        matchingNodeIds.has(e.source) && matchingNodeIds.has(e.target)
      ),
    };
  }, [data, searchQuery]);

  // Memoize input arrays to prevent infinite effect loops
  const inputNodes = useMemo(() => filteredData?.nodes || [], [filteredData?.nodes]);
  const inputEdges = useMemo(() => filteredData?.edges || [], [filteredData?.edges]);
  
  const { nodes, edges, dragStart, drag, dragEnd, reheat } = useGraphSimulation(
    inputNodes,
    inputEdges,
    {
      width: dimensions.width,
      height: dimensions.height,
      onTick: () => forceUpdate((n) => n + 1),
    }
  );

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== svgRef.current) return;

    const startX = e.clientX - transform.x;
    const startY = e.clientY - transform.y;

    const handleMouseMove = (e: MouseEvent) => {
      setTransform((t) => ({ ...t, x: e.clientX - startX, y: e.clientY - startY }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [transform.x, transform.y]);

  // Zoom handling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => ({
      ...t,
      scale: Math.min(Math.max(t.scale * delta, 0.1), 4),
    }));
  }, []);

  // Node click
  const handleNodeClick = useCallback(
    (nodeId: string, nodeType: 'seed' | 'thread' | 'discovery') => {
      selectNode(nodeId, nodeType);
    },
    [selectNode]
  );

  // Fit to view
  const handleFit = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
    reheat();
  }, [reheat]);

  // Always render container so ResizeObserver can measure it
  // Show overlay messages for loading/error/empty states
  const showGraph = !isLoading && !error && nodes.length > 0;

  return (
    <div ref={containerRef} className="h-full relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-muted z-10">
          Loading graph...
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-danger z-10">
          Failed to load graph
        </div>
      )}
      
      {!isLoading && !error && !filteredData?.nodes?.length && (
        <div className="absolute inset-0 flex items-center justify-center text-muted z-10">
          No data yet. Add a seed to get started.
        </div>
      )}

      {showGraph && (
        <>
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            className="cursor-grab active:cursor-grabbing"
          >
            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              {/* Edges */}
              {edges.map((edge) => {
                const source = typeof edge.source === 'string' 
                  ? nodes.find((n) => n.id === edge.source) 
                  : edge.source;
                const target = typeof edge.target === 'string'
                  ? nodes.find((n) => n.id === edge.target)
                  : edge.target;

                if (!source || !target) return null;

                return (
                  <line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#404040"
                    strokeWidth={1}
                    opacity={0.6}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map((node) => (
                <GraphNode
                  key={node.id}
                  node={node}
                  isSelected={node.id === selectedNodeId}
                  onClick={() => handleNodeClick(node.id, node.type)}
                  onDragStart={() => dragStart(node)}
                  onDrag={(x, y) => drag(node, x, y)}
                  onDragEnd={() => dragEnd(node)}
                />
              ))}
            </g>
          </svg>

          <GraphControls
            onZoomIn={() => setTransform((t) => ({ ...t, scale: Math.min(t.scale * 1.2, 4) }))}
            onZoomOut={() => setTransform((t) => ({ ...t, scale: Math.max(t.scale * 0.8, 0.1) }))}
            onFit={handleFit}
          />
        </>
      )}
    </div>
  );
}
