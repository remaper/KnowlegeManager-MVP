import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Ontology } from "@shared/schema";
import Layout from "@/components/Layout";
import {
  Braces,
  Edit,
  Trash2,
  Plus,
  Search,
  ArrowRight,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

const ontologySchema = z.object({
  name: z.string().min(2, "Name is required"),
  structure: z.string().min(2, "Structure is required").refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    {
      message: "Structure must be valid JSON",
    }
  ),
});

type OntologyFormValues = z.infer<typeof ontologySchema>;

export default function OntologyPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedOntology, setSelectedOntology] = useState<Ontology | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: ontologies = [], isLoading } = useQuery<Ontology[]>({
    queryKey: ["/api/ontologies"],
  });
  
  const createForm = useForm<OntologyFormValues>({
    resolver: zodResolver(ontologySchema),
    defaultValues: {
      name: "",
      structure: JSON.stringify({
        concepts: {},
        relationships: []
      }, null, 2),
    },
  });
  
  const editForm = useForm<OntologyFormValues>({
    resolver: zodResolver(ontologySchema),
    defaultValues: {
      name: "",
      structure: "",
    },
  });
  
  // Set form values when editing
  const handleEdit = (ontology: Ontology) => {
    setSelectedOntology(ontology);
    editForm.reset({
      name: ontology.name,
      structure: JSON.stringify(ontology.structure, null, 2),
    });
    setShowEditDialog(true);
  };
  
  const handleDelete = (ontology: Ontology) => {
    setSelectedOntology(ontology);
    setShowDeleteDialog(true);
  };
  
  const createMutation = useMutation({
    mutationFn: async (data: OntologyFormValues) => {
      const payload = {
        ...data,
        structure: JSON.parse(data.structure),
      };
      
      const res = await apiRequest("POST", "/api/ontologies", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Ontology created",
        description: "Your ontology has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ontologies"] });
      setShowCreateDialog(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating ontology",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: OntologyFormValues & { id: number }) => {
      const { id, ...payload } = data;
      
      const res = await apiRequest("PUT", `/api/ontologies/${id}`, {
        ...payload,
        structure: JSON.parse(payload.structure),
      });
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Ontology updated",
        description: "Your ontology has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ontologies"] });
      setShowEditDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating ontology",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/ontologies/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Ontology deleted",
        description: "The ontology has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ontologies"] });
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting ontology",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onCreateSubmit = (data: OntologyFormValues) => {
    createMutation.mutate(data);
  };
  
  const onEditSubmit = (data: OntologyFormValues) => {
    if (selectedOntology) {
      updateMutation.mutate({ ...data, id: selectedOntology.id });
    }
  };
  
  const onDeleteConfirm = () => {
    if (selectedOntology) {
      deleteMutation.mutate(selectedOntology.id);
    }
  };
  
  // Filter ontologies based on search
  const filteredOntologies = ontologies.filter(ontology =>
    searchQuery 
      ? ontology.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );
  
  return (
    <Layout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ontology Management</h1>
          <p className="text-gray-600 mt-1">
            Build and maintain knowledge structures and concept maps
          </p>
        </div>
        
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Ontology
        </Button>
      </div>
      
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search ontologies..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
        </div>
      ) : filteredOntologies.length === 0 ? (
        <div className="text-center py-20">
          <Braces className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">No ontologies found</h2>
          <p className="text-gray-500 mb-6">
            {searchQuery ? 
              "Try changing your search criteria" : 
              "Start by creating your first ontology"}
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            Create Ontology
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOntologies.map((ontology) => (
            <Card key={ontology.id}>
              <CardHeader>
                <CardTitle>{ontology.name}</CardTitle>
                <CardDescription>
                  Created {format(new Date(ontology.createdAt), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                  <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
                    {JSON.stringify(ontology.structure, null, 2)}
                  </pre>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Concepts:</span>{" "}
                    {Object.keys((ontology.structure as any)?.concepts || {}).length || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Relationships:</span>{" "}
                    {((ontology.structure as any)?.relationships || []).length}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Last Updated:</span>{" "}
                    {format(new Date(ontology.updatedAt), "MMM d, yyyy")}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEdit(ontology)}
                >
                  <Edit className="mr-1 h-4 w-4" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDelete(ontology)}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Ontology Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Ontology</DialogTitle>
            <DialogDescription>
              Define your concept hierarchy and relationships
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ontology Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ontology name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="structure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Structure (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter ontology structure as JSON" 
                        className="font-mono h-64"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Ontology"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Ontology Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Ontology</DialogTitle>
            <DialogDescription>
              Update your concept hierarchy and relationships
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ontology Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ontology name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="structure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Structure (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter ontology structure as JSON" 
                        className="font-mono h-64"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the ontology "{selectedOntology?.name}"? This action cannot be undone.
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
              onClick={onDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Ontology"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
