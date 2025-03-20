import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DocumentWithTags } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import DocumentUploadModal from "@/components/DocumentUploadModal";
import {
  FileText,
  FileCode,
  FileImage,
  FileSpreadsheet,
  File,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Eye,
  Download,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Documents() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  
  const { data: documents = [], isLoading } = useQuery<DocumentWithTags[]>({
    queryKey: ["/api/documents"],
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const confirmDelete = (id: number) => {
    setDocumentToDelete(id);
    setShowDeleteDialog(true);
  };
  
  const handleDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete);
    }
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return <FileText className="text-red-400 h-6 w-6" />;
    if (fileType.includes("word") || fileType.includes("doc")) return <FileText className="text-blue-400 h-6 w-6" />;
    if (fileType.includes("text")) return <FileText className="text-gray-400 h-6 w-6" />;
    if (fileType.includes("image")) return <FileImage className="text-green-400 h-6 w-6" />;
    if (fileType.includes("spreadsheet") || fileType.includes("excel")) return <FileSpreadsheet className="text-green-600 h-6 w-6" />;
    if (fileType.includes("code") || fileType.includes("json")) return <FileCode className="text-purple-400 h-6 w-6" />;
    return <File className="text-gray-400 h-6 w-6" />;
  };
  
  // Filter documents based on search and category
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery 
      ? doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (doc.summary && doc.summary.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
      
    const matchesCategory = selectedCategory 
      ? doc.category === selectedCategory 
      : true;
      
    return matchesSearch && matchesCategory;
  });
  
  // Get unique categories for filter
  const categories = Array.from(new Set(documents.map(doc => doc.category).filter(Boolean)));
  
  return (
    <Layout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">
            Manage your documents and knowledge base
          </p>
        </div>
        
        <Button onClick={() => setIsUploadModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Upload Document
        </Button>
      </div>
      
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search documents, tags, or content..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select
          value={selectedCategory || ""}
          onValueChange={(value) => setSelectedCategory(value || null)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">No documents found</h2>
          <p className="text-gray-500 mb-6">
            {searchQuery || selectedCategory ? 
              "Try changing your search or filter criteria" : 
              "Start by uploading your first document"}
          </p>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            Upload Document
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    {getFileIcon(document.fileType)}
                    <div>
                      <CardTitle className="text-lg">{document.title}</CardTitle>
                      <CardDescription>
                        {format(new Date(document.updatedAt), "MMM d, yyyy")}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Options</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate(`/documents/${document.id}`)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <SlidersHorizontal className="mr-2 h-4 w-4" /> Edit Metadata
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-500"
                        onClick={() => confirmDelete(document.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="pb-2">
                {document.summary ? (
                  <p className="text-gray-600 text-sm line-clamp-3">{document.summary}</p>
                ) : (
                  <p className="text-gray-400 text-sm italic">No summary available</p>
                )}
              </CardContent>
              
              <CardFooter className="flex flex-wrap gap-2 pt-2">
                {document.category && (
                  <Badge variant="outline" className="bg-gray-100">
                    {document.category}
                  </Badge>
                )}
                
                {document.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
                
                {document.tags.length > 3 && (
                  <Badge variant="outline">+{document.tags.length - 3}</Badge>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
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
    </Layout>
  );
}
