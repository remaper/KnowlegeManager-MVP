import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRoute } from "wouter";
import { format } from "date-fns";
import { DocumentWithTags, SemanticLink } from "@shared/schema";
import Layout from "@/components/Layout";
import SemanticNetworkGraph from "@/components/graphs/SemanticNetworkGraph";
import {
  FileText,
  FileCode,
  FileImage,
  FileSpreadsheet,
  File,
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Link as LinkIcon,
  Sparkles,
  Loader2,
  Save,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";

export default function DocumentDetail() {
  const [, params] = useRoute("/documents/:id");
  const documentId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAnalyzeDialog, setShowAnalyzeDialog] = useState(false);
  
  const { data: document, isLoading: isLoadingDocument } = useQuery<DocumentWithTags>({
    queryKey: [`/api/documents/${documentId}`],
    enabled: !!documentId,
  });
  
  const { data: links = [], isLoading: isLoadingLinks } = useQuery<SemanticLink[]>({
    queryKey: [`/api/documents/${documentId}/links`],
    enabled: !!documentId,
  });
  
  const { data: allDocuments = [], isLoading: isLoadingAllDocs } = useQuery<DocumentWithTags[]>({
    queryKey: ["/api/documents"],
    enabled: !!documentId,
  });
  
  // Update form when document data is loaded
  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setCategory(document.category || "");
      setSummary(document.summary || "");
      setTags(document.tags.map(tag => tag.name).join(", "));
    }
  }, [document]);
  
  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; category?: string; summary?: string; tags?: string }) => {
      const res = await apiRequest("PUT", `/api/documents/${documentId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Document updated",
        description: "Document metadata has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsEditMode(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
      window.history.back();
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const analyzeRelationshipsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/documents/${documentId}/analyze-relationships`, {});
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis complete",
        description: `Found ${data.relationships.length} relationships with other documents.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/links`] });
      setShowAnalyzeDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error analyzing relationships",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleSaveChanges = () => {
    updateMutation.mutate({ title, category, summary, tags });
  };
  
  const handleCancelEdit = () => {
    // Reset form values from document
    if (document) {
      setTitle(document.title);
      setCategory(document.category || "");
      setSummary(document.summary || "");
      setTags(document.tags.map(tag => tag.name).join(", "));
    }
    setIsEditMode(false);
  };
  
  const handleDelete = () => {
    deleteMutation.mutate();
  };
  
  const handleAnalyzeRelationships = () => {
    analyzeRelationshipsMutation.mutate();
  };
  
  const getFileIcon = (fileType: string = "") => {
    if (fileType.includes("pdf")) return <FileText className="text-red-400 h-10 w-10" />;
    if (fileType.includes("word") || fileType.includes("doc")) return <FileText className="text-blue-400 h-10 w-10" />;
    if (fileType.includes("text")) return <FileText className="text-gray-400 h-10 w-10" />;
    if (fileType.includes("image")) return <FileImage className="text-green-400 h-10 w-10" />;
    if (fileType.includes("spreadsheet") || fileType.includes("excel")) return <FileSpreadsheet className="text-green-600 h-10 w-10" />;
    if (fileType.includes("code") || fileType.includes("json")) return <FileCode className="text-purple-400 h-10 w-10" />;
    return <File className="text-gray-400 h-10 w-10" />;
  };
  
  // Prepare semantic network data
  const networkNodes = [];
  const networkLinks = [];
  
  if (document && links.length > 0) {
    // Add the current document
    networkNodes.push({
      id: document.id.toString(),
      label: document.title.substring(0, 8),
      group: 1
    });
    
    // Add all connected documents
    const linkedDocIds = new Set<number>();
    
    links.forEach(link => {
      const otherId = link.sourceDocumentId === document.id 
        ? link.targetDocumentId 
        : link.sourceDocumentId;
      
      linkedDocIds.add(otherId);
      
      networkLinks.push({
        source: link.sourceDocumentId.toString(),
        target: link.targetDocumentId.toString(),
        type: link.linkType,
        strength: link.strength
      });
    });
    
    // Add nodes for linked documents
    allDocuments
      .filter(doc => linkedDocIds.has(doc.id))
      .forEach(doc => {
        networkNodes.push({
          id: doc.id.toString(),
          label: doc.title.substring(0, 8),
          group: 2
        });
      });
  }
  
  if (isLoadingDocument) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
        </div>
      </Layout>
    );
  }
  
  if (!document) {
    return (
      <Layout>
        <div className="text-center py-10">
          <File className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Document not found</h2>
          <p className="text-gray-500 mb-6">
            The document you're looking for might have been deleted or doesn't exist.
          </p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancelEdit}
                disabled={updateMutation.isPending}
              >
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveChanges}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-1 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAnalyzeDialog(true)}
              >
                <Sparkles className="mr-1 h-4 w-4" /> Analyze Relationships
              </Button>
              <Button 
                variant="outline" 
                size="sm"
              >
                <Download className="mr-1 h-4 w-4" /> Download
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditMode(true)}
              >
                <Edit className="mr-1 h-4 w-4" /> Edit
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-gray-100 rounded-lg p-4">
                  {getFileIcon(document.fileType)}
                </div>
                
                <div className="flex-1 min-w-0">
                  {isEditMode ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-sm text-gray-500">Title</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="category" className="text-sm text-gray-500">Category</Label>
                        <Input
                          id="category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="mt-1"
                          placeholder="E.g., Research, Notes, Project"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="tags" className="text-sm text-gray-500">Tags (comma separated)</Label>
                        <Input
                          id="tags"
                          value={tags}
                          onChange={(e) => setTags(e.target.value)}
                          className="mt-1"
                          placeholder="E.g., research, machine learning, data"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{document.title}</h2>
                      
                      <div className="flex flex-wrap items-center space-x-2 mb-4">
                        {document.category && (
                          <Badge variant="outline" className="bg-gray-100">
                            {document.category}
                          </Badge>
                        )}
                        
                        <span className="text-sm text-gray-500">
                          Uploaded {format(new Date(document.createdAt), "MMM d, yyyy")}
                        </span>
                        
                        {document.createdAt !== document.updatedAt && (
                          <span className="text-sm text-gray-500">
                            · Updated {format(new Date(document.updatedAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {document.tags.map((tag) => (
                          <Badge key={tag.id} variant="secondary">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="content">
            <TabsList className="w-full">
              <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
              <TabsTrigger value="semantic-network" className="flex-1">Semantic Network</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditMode ? (
                    <Textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      placeholder="Enter a summary for this document"
                      className="min-h-32"
                    />
                  ) : document.summary ? (
                    <p className="text-gray-700">{document.summary}</p>
                  ) : (
                    <p className="text-gray-500 italic">No summary available for this document.</p>
                  )}
                </CardContent>
              </Card>
              
              {document.content && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Document Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-md">
                        {document.content}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="semantic-network" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Document Connections</CardTitle>
                  <CardDescription>
                    Visualizing how this document connects with others in your knowledge graph
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingLinks || isLoadingAllDocs ? (
                    <div className="h-64 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
                    </div>
                  ) : networkNodes.length <= 1 ? (
                    <div className="text-center py-8">
                      <LinkIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No connections found</h3>
                      <p className="text-gray-500 mb-4">
                        This document doesn't have any connections to other documents yet.
                      </p>
                      <Button onClick={() => setShowAnalyzeDialog(true)}>
                        <Sparkles className="mr-2 h-4 w-4" /> Analyze Relationships
                      </Button>
                    </div>
                  ) : (
                    <SemanticNetworkGraph
                      nodes={networkNodes}
                      links={networkLinks}
                      height={400}
                      onNodeClick={(nodeId) => {
                        if (nodeId !== document.id.toString()) {
                          window.location.href = `/documents/${nodeId}`;
                        }
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">File Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{document.filename}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">File Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">{document.fileType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(document.createdAt), "PPpp")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Modified</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {format(new Date(document.updatedAt), "PPpp")}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Document Links</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingLinks ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                </div>
              ) : links.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Relationship</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Strength</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {links.map((link) => {
                        const isSource = link.sourceDocumentId === document.id;
                        const otherId = isSource ? link.targetDocumentId : link.sourceDocumentId;
                        const otherDoc = allDocuments.find(d => d.id === otherId);
                        
                        return (
                          <TableRow key={link.id}>
                            <TableCell className="font-medium capitalize">
                              {link.linkType}
                            </TableCell>
                            <TableCell>
                              <a 
                                href={`/documents/${otherId}`}
                                className="text-primary-600 hover:underline"
                              >
                                {otherDoc ? otherDoc.title : `Document #${otherId}`}
                              </a>
                            </TableCell>
                            <TableCell>{link.strength}/10</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setShowAnalyzeDialog(true)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" /> Analyze More Relationships
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <LinkIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 mb-4">No links found for this document</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAnalyzeDialog(true)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" /> Analyze Relationships
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{document.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Analyze Relationships Dialog */}
      <Dialog open={showAnalyzeDialog} onOpenChange={setShowAnalyzeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analyze Document Relationships</DialogTitle>
            <DialogDescription>
              Use AI to detect relationships between this document and others in your collection. This will automatically create semantic links.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-2">This analysis will:</p>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li>Compare content across your documents</li>
              <li>Identify similarities, references, and citations</li>
              <li>Create weighted semantic links between documents</li>
              <li>Build your knowledge graph for better insights</li>
            </ul>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAnalyzeDialog(false)}
              disabled={analyzeRelationshipsMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAnalyzeRelationships}
              disabled={analyzeRelationshipsMutation.isPending}
            >
              {analyzeRelationshipsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Start Analysis
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
