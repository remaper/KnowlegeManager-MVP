import { useQuery } from "@tanstack/react-query";
import { Tag } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TopTags() {
  const { data: tags = [], isLoading } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });
  
  // Count occurrences of each tag
  const tagCounts = tags.reduce<Record<string, { id: number; count: number }>>(
    (acc, tag) => {
      const key = tag.name.toLowerCase();
      if (!acc[key]) {
        acc[key] = { id: tag.id, count: 0 };
      }
      acc[key].count += 1;
      return acc;
    },
    {}
  );
  
  // Sort tags by count and get top N
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, { id, count }]) => ({ id, name, count }));
  
  // Get color based on tag name
  const getTagColor = (tagName: string) => {
    const colors = [
      "bg-primary-100 text-primary-800",
      "bg-purple-100 text-purple-800",
      "bg-green-100 text-green-800",
      "bg-yellow-100 text-yellow-800",
      "bg-red-100 text-red-800",
      "bg-blue-100 text-blue-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800",
      "bg-gray-100 text-gray-800",
    ];
    
    // Use hash of tag name to select a consistent color
    const hash = tagName.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return colors[hash % colors.length];
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequently Used Tags</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : sortedTags.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {sortedTags.map(tag => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={`rounded-full px-3 py-1 ${getTagColor(tag.name)}`}
                >
                  {tag.name} <span className="ml-1 text-xs opacity-70">({tag.count})</span>
                </Badge>
              ))}
            </div>
            
            <div className="mt-4 text-sm">
              <Button variant="link" className="p-0 h-auto text-primary-600">
                Manage all tags
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No tags available yet. Tags will appear as you add them to documents.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
