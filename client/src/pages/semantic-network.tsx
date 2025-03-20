import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Document, SemanticLink } from "@shared/schema";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import SemanticNetworkGraph from "@/components/graphs/SemanticNetworkGraph";
import { Loader2, Filter, Search, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function SemanticNetwork() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [linkTypeFilter, setLinkTypeFilter] = useState<string[]>([]);
  const [minStrength, setMinStrength] = useState(1);
  const [maxNodes, setMaxNodes] = useState(50);
  
  // Fetch all documents
  const { data: documents = [], isLoading: isLoadingDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });
  
  // Fetch all links between documents
  const { data: allLinks = [], isLoading: isLoadingLinks } = useQuery<SemanticLink[]>({
    queryKey: ["/api/semantic-links"],
    queryFn: async () => {
      // We'll collect links for all our documents
      const links: SemanticLink[] = [];
      
      for (const doc of documents) {
        try {
          const response = await fetch(`/api/documents/${doc.id}/links`, {
            credentials: "include"
          });
          
          if (response.ok) {
            const docLinks = await response.json();
            links.push(...docLinks);
          }
        } catch (error) {
          console.error(`Error fetching links for document ${doc.id}:`, error);
        }
      }
      
      // Remove duplicates (links can appear for both source and target docs)
      const linkMap = new Map<string, SemanticLink>();
      links.forEach(link => {
        const key = `${Math.min(link.sourceDocumentId, link.targetDocumentId)}-${Math.max(link.sourceDocumentId, link.targetDocumentId)}`;
        if (!linkMap.has(key) || link.strength > (linkMap.get(key)?.strength || 0)) {
          linkMap.set(key, link);
        }
      });
      
      return Array.from(linkMap.values());
    },
    enabled: documents.length > 0,
  });
  
  // Get unique categories and link types for filters
  const categories = Array.from(new Set(documents.map(doc => doc.category).filter(Boolean)));
  const linkTypes = Array.from(new Set(allLinks.map(link => link.linkType)));
  
  // Filter documents based on search and category
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery 
      ? doc.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
      
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
      
    return matchesSearch && matchesCategory;
  });
  
  // Filter links based on document filters and link type filter
  const filteredLinks = allLinks.filter(link => {
    const sourceDoc = filteredDocuments.find(doc => doc.id === link.sourceDocumentId);
    const targetDoc = filteredDocuments.find(doc => doc.id === link.targetDocumentId);
    
    const isDocumentIncluded = sourceDoc && targetDoc;
    
    const matchesLinkType = linkTypeFilter.length === 0 || 
      linkTypeFilter.includes(link.linkType);
    
    const meetsStrengthThreshold = link.strength >= minStrength;
    
    return isDocumentIncluded && matchesLinkType && meetsStrengthThreshold;
  });
  
  // Limit to max nodes for performance
  const limitedDocuments = filteredDocuments.slice(0, maxNodes);
  
  // Only include links between limited documents
  const limitedLinks = filteredLinks.filter(link => 
    limitedDocuments.some(doc => doc.id === link.sourceDocumentId) &&
    limitedDocuments.some(doc => doc.id === link.targetDocumentId)
  );
  
  // Prepare graph data
  const graphNodes = limitedDocuments.map(doc => ({
    id: doc.id.toString(),
    label: doc.title.substring(0, 8),
    type: doc.category || "document",
    group: categories.indexOf(doc.category || "") + 1,
  }));
  
  const graphLinks = limitedLinks.map(link => ({
    source: link.sourceDocumentId.toString(),
    target: link.targetDocumentId.toString(),
    type: link.linkType,
    strength: link.strength,
  }));
  
  // Handle link type filter toggle
  const handleLinkTypeToggle = (type: string) => {
    setLinkTypeFilter(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Semantic Network</h1>
        <p className="text-gray-600 mt-1">
          Visualize connections between your documents and concepts
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Filters</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        Filter the network to focus on specific documents and relationships
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">Search Documents</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by title..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => setSelectedCategory(value as string)}
                >
                  <SelectTrigger id="category" className="mt-1">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Link Types</Label>
                <div className="space-y-2 mt-1">
                  {linkTypes.length > 0 ? (
                    <Accordion type="multiple" className="w-full">
                      <AccordionItem value="link-types">
                        <AccordionTrigger className="text-sm py-2">
                          {linkTypeFilter.length > 0 
                            ? `${linkTypeFilter.length} selected` 
                            : "All Types"}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-1">
                            {linkTypes.map((type) => (
                              <div key={type} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`link-type-${type}`}
                                  checked={linkTypeFilter.includes(type)}
                                  onCheckedChange={() => handleLinkTypeToggle(type)}
                                />
                                <Label 
                                  htmlFor={`link-type-${type}`}
                                  className="text-sm capitalize cursor-pointer"
                                >
                                  {type}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      No link types available
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="min-strength">Minimum Strength</Label>
                  <span className="text-sm text-gray-500">{minStrength}</span>
                </div>
                <Slider
                  id="min-strength"
                  min={1}
                  max={10}
                  step={1}
                  value={[minStrength]}
                  onValueChange={(values) => setMinStrength(values[0])}
                  className="mt-2"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-nodes">Maximum Nodes</Label>
                  <span className="text-sm text-gray-500">{maxNodes}</span>
                </div>
                <Slider
                  id="max-nodes"
                  min={10}
                  max={100}
                  step={10}
                  value={[maxNodes]}
                  onValueChange={(values) => setMaxNodes(values[0])}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Limiting nodes improves performance
                </p>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setLinkTypeFilter([]);
                  setMinStrength(1);
                  setMaxNodes(50);
                }}
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Network Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Documents</dt>
                  <dd className="text-sm font-medium">{graphNodes.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Connections</dt>
                  <dd className="text-sm font-medium">{graphLinks.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Link Types</dt>
                  <dd className="text-sm font-medium">
                    {new Set(graphLinks.map(link => link.type)).size}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Avg. Strength</dt>
                  <dd className="text-sm font-medium">
                    {graphLinks.length > 0
                      ? (graphLinks.reduce((sum, link) => sum + (link.strength || 0), 0) / graphLinks.length).toFixed(1)
                      : "N/A"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Knowledge Graph</CardTitle>
              <CardDescription>
                Interactive visualization of your document connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDocuments || isLoadingLinks ? (
                <div className="h-[600px] flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
                    <p className="text-gray-500">Building your knowledge graph...</p>
                  </div>
                </div>
              ) : graphNodes.length === 0 || graphLinks.length === 0 ? (
                <div className="h-[600px] flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <Filter className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No connections to display</h3>
                    <p className="text-gray-500 mb-6">
                      {documents.length === 0
                        ? "Upload documents to start building your semantic network"
                        : "Try adjusting your filters or add more semantic links between documents"}
                    </p>
                    <Button onClick={() => navigate("/documents")}>
                      Manage Documents
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-[600px]">
                  <SemanticNetworkGraph
                    nodes={graphNodes}
                    links={graphLinks}
                    height={600}
                    onNodeClick={(nodeId) => navigate(`/documents/${nodeId}`)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
