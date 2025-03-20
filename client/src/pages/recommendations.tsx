import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import {
  Sparkles,
  FileText,
  BookOpen,
  LightbulbIcon,
  ArrowRight,
  Loader2,
  RefreshCw,
  Star,
  StarHalf
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Recommendation {
  type: string;
  title: string;
  description: string;
  relevance: number;
  documentId?: number;
}

export default function Recommendations() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: recommendations = [], isLoading, refetch, isRefetching } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });
  
  const getRecommendationIcon = (type: string, className: string = "h-5 w-5") => {
    switch (type) {
      case "existing_document":
        return <FileText className={`${className} text-primary-600`} />;
      case "suggested_reading":
        return <BookOpen className={`${className} text-green-600`} />;
      case "task":
        return <LightbulbIcon className={`${className} text-purple-600`} />;
      case "info":
        return <LightbulbIcon className={`${className} text-blue-600`} />;
      case "error":
      case "quota_error":
        return <LightbulbIcon className={`${className} text-amber-600`} />;
      default:
        return <FileText className={`${className} text-primary-600`} />;
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
      case "info":
        return "bg-blue-100";
      case "error":
        return "bg-red-100";
      case "quota_error":
        return "bg-amber-100";
      default:
        return "bg-primary-100";
    }
  };
  
  const handleRecommendationClick = (recommendation: Recommendation) => {
    if (recommendation.type === "existing_document" && recommendation.documentId) {
      navigate(`/documents/${recommendation.documentId}`);
    } else if (recommendation.type === "info" || recommendation.type === "quota_error" || recommendation.type === "error") {
      // For info and error messages, do nothing on click
      return;
    }
  };
  
  const isClickable = (type: string): boolean => {
    return !["info", "error", "quota_error"].includes(type);
  };
  
  // Filter recommendations based on active tab
  const filteredRecommendations = recommendations.filter(rec => {
    if (activeTab === "all") return true;
    return rec.type === activeTab;
  });
  
  // Get count by type
  const countByType = recommendations.reduce((acc, rec) => {
    acc[rec.type] = (acc[rec.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Render stars for relevance
  const renderRelevanceStars = (relevance: number) => {
    const fullStars = Math.floor(relevance / 2);
    const hasHalfStar = relevance % 2 !== 0;
    
    return (
      <div className="flex items-center">
        {Array(fullStars).fill(0).map((_, i) => (
          <Star key={`full-${i}`} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
        ))}
        {hasHalfStar && <StarHalf className="h-4 w-4 text-yellow-400 fill-yellow-400" />}
        {Array(5 - fullStars - (hasHalfStar ? 1 : 0)).fill(0).map((_, i) => (
          <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
        ))}
      </div>
    );
  };
  
  return (
    <Layout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
          <p className="text-gray-600 mt-1">
            Personalized content based on your knowledge graph
          </p>
        </div>
        
        <Button 
          onClick={() => refetch()} 
          disabled={isLoading || isRefetching}
        >
          {isRefetching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh Recommendations
            </>
          )}
        </Button>
      </div>
      
      <Tabs 
        defaultValue="all" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="all">
            All ({recommendations.length})
          </TabsTrigger>
          <TabsTrigger value="existing_document">
            Documents ({countByType.existing_document || 0})
          </TabsTrigger>
          <TabsTrigger value="suggested_reading">
            Readings ({countByType.suggested_reading || 0})
          </TabsTrigger>
          <TabsTrigger value="task">
            Tasks ({countByType.task || 0})
          </TabsTrigger>
          {(countByType.info || 0) > 0 && (
            <TabsTrigger value="info">
              Info ({countByType.info})
            </TabsTrigger>
          )}
          {(countByType.error || 0) > 0 && (
            <TabsTrigger value="error">
              Errors ({countByType.error})
            </TabsTrigger>
          )}
          {(countByType.quota_error || 0) > 0 && (
            <TabsTrigger value="quota_error">
              API Issues ({countByType.quota_error})
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary-500" />
                <p className="text-gray-500">Generating recommendations...</p>
              </div>
            </div>
          ) : filteredRecommendations.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-gray-900 mb-2">No recommendations available</h2>
              <p className="text-gray-500 mb-6">
                {recommendations.length > 0
                  ? "Try selecting a different category"
                  : "Add more documents to get personalized recommendations"}
              </p>
              <Button onClick={() => navigate("/documents")}>
                Manage Documents
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecommendations.map((recommendation, index) => (
                <Card 
                  key={index}
                  className={isClickable(recommendation.type) ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                  onClick={() => handleRecommendationClick(recommendation)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className="capitalize">
                        {recommendation.type.replace("_", " ")}
                      </Badge>
                      {renderRelevanceStars(recommendation.relevance)}
                    </div>
                    <CardTitle className="text-lg mt-2">
                      {recommendation.title}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-gray-600">{recommendation.description}</p>
                  </CardContent>
                  
                  <CardFooter>
                    <div className="flex justify-between items-center w-full">
                      <div className={`flex-shrink-0 w-10 h-10 ${getRecommendationBgColor(recommendation.type)} rounded-lg flex items-center justify-center`}>
                        {getRecommendationIcon(recommendation.type)}
                      </div>
                      
                      {recommendation.type === "existing_document" && recommendation.documentId && (
                        <Button variant="ghost" size="sm">
                          View Document <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                      
                      {recommendation.type === "suggested_reading" && (
                        <Button variant="ghost" size="sm">
                          Explore <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                      
                      {recommendation.type === "task" && (
                        <Button variant="ghost" size="sm">
                          Add to Priorities <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
