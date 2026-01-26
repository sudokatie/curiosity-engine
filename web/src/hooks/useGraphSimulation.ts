import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { GraphNode, GraphEdge } from '../types';

interface SimulationNode extends GraphNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

interface SimulationEdge {
  id: string;
  source: SimulationNode | string;
  target: SimulationNode | string;
  type: string;
}

interface UseGraphSimulationOptions {
  width: number;
  height: number;
  onTick?: () => void;
}

export function useGraphSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: UseGraphSimulationOptions
) {
  const { width, height, onTick } = options;
  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationEdge> | null>(null);
  const nodesRef = useRef<SimulationNode[]>([]);
  const edgesRef = useRef<SimulationEdge[]>([]);
  const onTickRef = useRef(onTick);
  
  // Keep callback ref updated without restarting simulation
  onTickRef.current = onTick;

  // Initialize or update simulation
  useEffect(() => {
    if (!width || !height || !nodes.length) return;

    // Stop any running simulation before updating
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Build a map of existing node positions to preserve them
    const existingPositions = new Map<string, { x: number; y: number }>();
    for (const node of nodesRef.current) {
      existingPositions.set(node.id, { x: node.x, y: node.y });
    }

    // Convert to simulation format, preserving positions where possible
    const simNodes: SimulationNode[] = nodes.map((n) => {
      const existing = existingPositions.get(n.id);
      return {
        ...n,
        x: existing?.x ?? n.x ?? width / 2 + (Math.random() - 0.5) * 100,
        y: existing?.y ?? n.y ?? height / 2 + (Math.random() - 0.5) * 100,
      };
    });

    // Build a set of valid node IDs for filtering edges
    const nodeIdSet = new Set(simNodes.map((n) => n.id));

    // Create edges with string IDs, filtering out any with missing nodes
    const simEdges: SimulationEdge[] = edges
      .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
      }));

    nodesRef.current = simNodes;
    edgesRef.current = simEdges;

    // Create simulation if needed
    if (!simulationRef.current) {
      simulationRef.current = d3
        .forceSimulation<SimulationNode, SimulationEdge>()
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30))
        .force(
          'link',
          d3
            .forceLink<SimulationNode, SimulationEdge>()
            .id((d) => d.id)
            .distance(80)
        );
    }

    // Set nodes FIRST so D3 can resolve string IDs in links
    simulationRef.current
      .nodes(simNodes)
      .on('tick', () => onTickRef.current?.());

    // Now set links - D3 will resolve string IDs against the nodes
    const linkForce = simulationRef.current.force('link') as d3.ForceLink<
      SimulationNode,
      SimulationEdge
    >;
    linkForce.links(simEdges);

    // Restart with appropriate alpha
    simulationRef.current.alpha(0.5).restart();

    return () => {
      simulationRef.current?.stop();
    };
  }, [nodes, edges, width, height]);

  // Update center force when dimensions change
  useEffect(() => {
    if (simulationRef.current && width && height) {
      const centerForce = simulationRef.current.force('center') as d3.ForceCenter<SimulationNode>;
      centerForce?.x(width / 2).y(height / 2);
      simulationRef.current.alpha(0.1).restart();
    }
  }, [width, height]);

  const dragStart = useCallback((node: SimulationNode) => {
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
      node.fx = node.x;
      node.fy = node.y;
    }
  }, []);

  const drag = useCallback((node: SimulationNode, x: number, y: number) => {
    node.fx = x;
    node.fy = y;
  }, []);

  const dragEnd = useCallback((node: SimulationNode) => {
    if (simulationRef.current) {
      simulationRef.current.alphaTarget(0);
    }
    node.fx = null;
    node.fy = null;
  }, []);

  const reheat = useCallback(() => {
    simulationRef.current?.alpha(0.5).restart();
  }, []);

  return {
    nodes: nodesRef.current,
    edges: edgesRef.current,
    dragStart,
    drag,
    dragEnd,
    reheat,
  };
}
