import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, BookOpen, LightbulbIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface Recommendation {
  type: string;
  title: string;
  description: string;
  relevance: number;
  documentId?: number;
}

export default function Recommendations() {
  const [, navigate] = useLocation();
  
  const { data: recommendations, isLoading, error } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });
  
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "existing_document":
        return <FileText className="h-5 w-5 text-primary-600" />;
      case "suggested_reading":
        return <BookOpen className="h-5 w-5 text-green-600" />;
      case "task":
        return <LightbulbIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <FileText className="h-5 w-5 text-primary-600" />;
    }
  };
  
  const getRecommendationBgColor = (type: string) => {
    switch (type) {
      case "existing_document":
        return "bg-primary-100";
      case "suggested_reading":
        return "bg-green-100";
      case "task":
        return "bg-purple-100";
      default:
        return "bg-primary-100";
    }
  };
  
  const handleRecommendationClick = (recommendation: Recommendation) => {
    if (recommendation.type === "existing_document" && recommendation.documentId) {
      navigate(`/documents/${recommendation.documentId}`);
    }
  };
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recommended for You</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">
            Error loading recommendations. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recommended for You</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : recommendations && recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleRecommendationClick(recommendation)}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-10 h-10 ${getRecommendationBgColor(recommendation.type)} rounded-lg flex items-center justify-center`}>
                    {getRecommendationIcon(recommendation.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">{recommendation.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{recommendation.description}</p>
                  </div>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate("/recommendations")}
            >
              View More Recommendations
            </Button>
          </div>
        ) : (
          <div className="text-center py-6">
            <LightbulbIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Add more documents to get personalized recommendations</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
