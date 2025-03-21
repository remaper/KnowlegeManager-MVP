import { useQuery } from "@tanstack/react-query";
import { Document, DocumentWithTags, Tag } from "@shared/schema";
import { format } from "date-fns";
import {
  FileText,
  FileCode,
  FileImage,
  FileSpreadsheet,
  File,
  Eye,
  Download,
  MoreHorizontal,
  Loader2
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

export default function RecentDocuments() {
  const [, navigate] = useLocation();
  
  const { data: documents, isLoading, error } = useQuery<DocumentWithTags[]>({
    queryKey: ["/api/documents"],
  });
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return <FileText className="text-red-400" />;
    if (fileType.includes("word") || fileType.includes("doc")) return <FileText className="text-blue-400" />;
    if (fileType.includes("text")) return <FileText className="text-gray-400" />;
    if (fileType.includes("image")) return <FileImage className="text-green-400" />;
    if (fileType.includes("spreadsheet") || fileType.includes("excel")) return <FileSpreadsheet className="text-green-600" />;
    if (fileType.includes("code") || fileType.includes("json")) return <FileCode className="text-purple-400" />;
    return <File className="text-gray-400" />;
  };
  
  const getTagColor = (tagName: string) => {
    const colors = {
      research: "bg-primary-100 text-primary-800",
      notes: "bg-green-100 text-green-800",
      project: "bg-yellow-100 text-yellow-800",
      academic: "bg-red-100 text-red-800",
      ml: "bg-purple-100 text-purple-800",
      data: "bg-blue-100 text-blue-800",
    };
    
    const colorKey = Object.keys(colors).find(key => 
      tagName.toLowerCase().includes(key)
    );
    
    return colorKey ? colors[colorKey as keyof typeof colors] : "bg-gray-100 text-gray-800";
  };
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">
            Error loading documents. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Documents</CardTitle>
        <Button variant="link" size="sm" onClick={() => navigate("/documents")}>
          View all
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                  <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
                  <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {documents.slice(0, 5).map((doc) => (
                  <tr key={doc.id}>
                    <td className="py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {getFileIcon(doc.fileType)}
                        <span className="ml-3 font-medium text-gray-900">{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {doc.tags && doc.tags.length > 0 ? (
                          doc.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag.id}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTagColor(tag.name)}`}
                            >
                              {tag.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">No tags</span>
                        )}
                        {doc.tags && doc.tags.length > 3 && (
                          <span className="text-xs text-gray-500">+{doc.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(doc.updatedAt), "MMM d, yyyy")}
                    </td>
                    <td className="py-3 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/documents/${doc.id}`)}
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4 text-gray-500" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Options</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(`/documents/${doc.id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>Download</DropdownMenuItem>
                            <DropdownMenuItem>Share</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>No documents found</p>
            <p className="text-sm mt-1">Upload documents to get started</p>
            <Button 
              className="mt-4" 
              onClick={() => setIsUploadModalOpen(true)}
              variant="outline"
            >
              Upload your first document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
