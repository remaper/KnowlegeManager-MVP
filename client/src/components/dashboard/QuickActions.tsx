import { useState } from "react";
import { UploadCloud, BrainCircuit, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DocumentUploadModal from "@/components/DocumentUploadModal";
import { useLocation } from "wouter";

export default function QuickActions() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [, navigate] = useLocation();
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center p-6 h-auto"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <UploadCloud className="h-8 w-8 text-primary-500 mb-2" />
              <span>Upload Document</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center p-6 h-auto"
              onClick={() => navigate("/ontology")}
            >
              <BrainCircuit className="h-8 w-8 text-secondary-500 mb-2" />
              <span>Build Ontology</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center justify-center p-6 h-auto"
              onClick={() => navigate("/recommendations")}
            >
              <Sparkles className="h-8 w-8 text-amber-500 mb-2" />
              <span>Generate Insights</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <DocumentUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
    </>
  );
}
