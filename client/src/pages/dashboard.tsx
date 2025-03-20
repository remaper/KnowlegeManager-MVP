import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import Layout from "@/components/Layout";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentDocuments from "@/components/dashboard/RecentDocuments";
import Recommendations from "@/components/dashboard/Recommendations";
import Priorities from "@/components/dashboard/Priorities";
import TopTags from "@/components/dashboard/TopTags";
import SemanticNetworkGraph from "@/components/graphs/SemanticNetworkGraph";
import { Document, SemanticLink } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [, navigate] = useLocation();
  
  const { data: documents, isLoading: isLoadingDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });
  
  // Get only the most recent documents for network visualization
  const recentDocIds = documents?.slice(0, 10).map(doc => doc.id) || [];
  
  // Create a query for all links between recent documents
  const { data: allLinks = [], isLoading: isLoadingLinks } = useQuery<SemanticLink[]>({
    queryKey: ["/api/semantic-links", recentDocIds],
    enabled: recentDocIds.length > 0,
    queryFn: async () => {
      // We'll collect links for all our recent documents
      const links: SemanticLink[] = [];
      
      for (const docId of recentDocIds) {
        try {
          const response = await fetch(`/api/documents/${docId}/links`, {
            credentials: "include"
          });
          
          if (response.ok) {
            const docLinks = await response.json();
            links.push(...docLinks);
          }
        } catch (error) {
          console.error(`Error fetching links for document ${docId}:`, error);
        }
      }
      
      return links;
    }
  });
  
  // Prepare graph data for visualization
  const graphNodes = documents
    ?.filter(doc => recentDocIds.includes(doc.id))
    .map(doc => ({
      id: doc.id.toString(),
      label: doc.title.substring(0, 8),
      type: doc.category || "document",
    })) || [];
  
  const graphLinks = allLinks
    .filter(link => 
      recentDocIds.includes(link.sourceDocumentId) && 
      recentDocIds.includes(link.targetDocumentId)
    )
    .map(link => ({
      source: link.sourceDocumentId.toString(),
      target: link.targetDocumentId.toString(),
      type: link.linkType,
      strength: link.strength,
    }));
  
  return (
    <Layout>
      {/* Dashboard header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dashboard.welcome")}, {user?.username}
        </h1>
        <p className="text-gray-600 mt-1">{format(new Date(), language === 'ko' ? 'yyyy년 MM월 dd일 EEEE' : "EEEE, MMMM d, yyyy")}</p>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">{t("sidebar.documents")}</h3>
              <span className="text-2xl font-semibold text-gray-900">
                {isLoadingDocuments ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  documents?.length || 0
                )}
              </span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">{language === 'ko' ? '연결된 개념' : 'Linked Concepts'}</h3>
              <span className="text-2xl font-semibold text-gray-900">
                {isLoadingLinks ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                ) : (
                  allLinks.length || 0
                )}
              </span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">{language === 'ko' ? '활성 프로젝트' : 'Active Projects'}</h3>
              <span className="text-2xl font-semibold text-gray-900">
                {/* Will be implemented with project functionality */}
                {Math.min(documents?.length || 0, 3)}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          <QuickActions />
          
          {/* Recent documents */}
          <RecentDocuments />
          
          {/* Interactive Semantic Network Preview */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">{t("sidebar.semantic")}</h2>
              <button 
                className="text-primary-600 text-sm hover:underline"
                onClick={() => navigate("/semantic-network")}
              >
                {language === 'ko' ? '전체 그래프 탐색' : 'Explore full graph'}
              </button>
            </div>
            
            <SemanticNetworkGraph 
              nodes={graphNodes} 
              links={graphLinks} 
              height={300} 
              onNodeClick={(nodeId) => navigate(`/documents/${nodeId}`)}
              isLoading={isLoadingDocuments || isLoadingLinks}
            />
          </div>
        </div>
        
        {/* Right column */}
        <div className="space-y-6">
          {/* Recommendations */}
          <Recommendations />
          
          {/* Priorities */}
          <Priorities />
          
          {/* Top Tags */}
          <TopTags />
        </div>
      </div>
    </Layout>
  );
}
