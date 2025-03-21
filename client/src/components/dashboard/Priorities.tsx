import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Priority } from "@shared/schema";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const prioritySchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional().nullable(),
});

type PriorityFormValues = z.infer<typeof prioritySchema>;

export default function Priorities() {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { data: priorities, isLoading } = useQuery<Priority[]>({
    queryKey: ["/api/priorities"],
  });
  
  const completeMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("PUT", `/api/priorities/${id}/complete`, { completed });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/priorities"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating priority",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PriorityFormValues) => {
      const payload = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      
      const res = await apiRequest("POST", "/api/priorities", payload);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Priority created",
        description: "Your new task has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/priorities"] });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating priority",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const form = useForm<PriorityFormValues>({
    resolver: zodResolver(prioritySchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
    },
  });
  
  const onSubmit = (data: PriorityFormValues) => {
    createMutation.mutate(data);
  };
  
  const handleCheckboxChange = (id: number, completed: boolean) => {
    completeMutation.mutate({ id, completed: !completed });
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Current Priorities</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : priorities && priorities.length > 0 ? (
            <div className="space-y-3">
              {priorities.map((priority) => (
                <div key={priority.id} className="flex items-center">
                  <Checkbox
                    id={`priority-${priority.id}`}
                    checked={priority.completed ?? false}
                    onCheckedChange={() => handleCheckboxChange(priority.id, priority.completed ?? false)}
                    className="h-4 w-4"
                  />
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${priority.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {priority.title}
                    </p>
                    {priority.dueDate && (
                      <p className="text-xs text-gray-500">
                        Due {format(new Date(priority.dueDate), "MMM d")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No priorities yet
            </div>
          )}
          
          <div className="mt-4">
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary-600 p-0" 
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" /> Add new priority
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Priority</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter priority title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter additional details" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Adding..." : "Add Priority"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
