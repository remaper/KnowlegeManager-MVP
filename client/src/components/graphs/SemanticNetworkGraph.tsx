import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Node {
  id: string;
  label: string;
  type?: string;
  group?: number;
}

interface Link {
  source: string;
  target: string;
  type?: string;
  strength?: number | null;
}

interface SemanticNetworkGraphProps {
  nodes: Node[];
  links: Link[];
  height?: number;
  onNodeClick?: (nodeId: string) => void;
  isLoading?: boolean;
}

export default function SemanticNetworkGraph({
  nodes,
  links,
  height = 400,
  onNodeClick,
  isLoading = false,
}: SemanticNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height });
  
  const initializeGraph = useCallback(() => {
    if (!svgRef.current || nodes.length === 0) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    const width = dimensions.width;
    const height = dimensions.height;
    
    // Create a simulation with forces
    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(30));
    
    // Create a zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom as any);
    
    // Create container for the visualization
    const g = svg.append("g");
    
    // Define color scale for node types/groups
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    
    // Create links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", (d) => (d.strength ? d.strength / 2 : 1))
      .attr("stroke-opacity", 0.6);
    
    // Create node groups
    const node = g
      .append("g")
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .on("click", function(_event, d: any) {
        if (onNodeClick) onNodeClick(d.id);
      })
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any
      );
    
    // Add circles to nodes
    node
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d) => color(d.group?.toString() || d.type || "default"))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);
    
    // Add labels to nodes
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .text((d) => d.label.substring(0, 8))
      .attr("fill", "#fff")
      .attr("font-size", "10px")
      .attr("pointer-events", "none");
    
    // Add title for tooltip on hover
    node.append("title").text((d) => d.label);
    
    // Update positions during simulation
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });
    
    // Define drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Functions for zoom controls
    (window as any).zoomIn = function() {
      svg.transition().call(zoom.scaleBy as any, 1.5);
    };
    
    (window as any).zoomOut = function() {
      svg.transition().call(zoom.scaleBy as any, 0.75);
    };
    
    (window as any).resetZoom = function() {
      svg
        .transition()
        .call(zoom.transform as any, d3.zoomIdentity);
    };
  }, [nodes, links, dimensions, onNodeClick]);
  
  // Initialize dimensions on mount and when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const { width } = svgRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [height]);
  
  // Initialize or update graph when data or dimensions change
  useEffect(() => {
    initializeGraph();
  }, [nodes, links, dimensions, initializeGraph]);
  
  // Zoom controls
  const handleZoomIn = () => (window as any).zoomIn?.();
  const handleZoomOut = () => (window as any).zoomOut?.();
  const handleResetZoom = () => (window as any).resetZoom?.();
  
  return (
    <div className="relative">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-50 z-10">
          <div className="flex flex-col items-center space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
            <span className="text-sm text-gray-600">Loading graph...</span>
          </div>
        </div>
      ) : null}
      
      <div className="bg-gray-50 rounded-lg overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="bg-gray-50"
        ></svg>
        
        <div className="mt-4 p-2 flex justify-between items-center text-sm text-gray-500">
          <div>Showing {nodes.length} nodes and {links.length} connections</div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4 mr-1" /> Zoom In
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4 mr-1" /> Zoom Out
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetZoom}>
              <RefreshCw className="h-4 w-4 mr-1" /> Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
