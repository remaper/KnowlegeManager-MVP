import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  FileText, 
  Network, 
  Braces, 
  Star, 
  Settings, 
  LogOut,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Document } from "@shared/schema";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { t } = useLanguage();

  const { data: documents, isLoading: isLoadingDocuments } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    enabled: !!user,
  });

  const recentDocuments = documents?.slice(0, 3) || [];

  const sidebarItems = [
    { path: "/", label: t("sidebar.dashboard"), icon: <LayoutDashboard className="h-5 w-5" /> },
    { path: "/documents", label: t("sidebar.documents"), icon: <FileText className="h-5 w-5" /> },
    { path: "/semantic-network", label: t("sidebar.semantic"), icon: <Network className="h-5 w-5" /> },
    { path: "/ontology", label: t("sidebar.ontology"), icon: <Braces className="h-5 w-5" /> },
    { path: "/recommendations", label: t("sidebar.recommendations"), icon: <Star className="h-5 w-5" /> },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <aside 
      className={cn(
        "bg-white w-64 h-full fixed left-0 top-0 shadow-lg z-20 md:relative transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center">
              <Network className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-800">{t("app.name")}</h1>
          </div>
        </div>
        
        {user && (
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} />
              </Avatar>
              <div>
                <h2 className="font-medium text-gray-800">{user.username}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        )}
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {sidebarItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path}>
                  <a 
                    className={cn(
                      "flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100",
                      location === item.path && "bg-primary-50 border-l-3 border-primary-600"
                    )}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
          
          <div className="mt-4 px-6 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t("dashboard.recentDocuments")}
            </h3>
          </div>
          
          {isLoadingDocuments ? (
            <div className="px-6 py-4 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : recentDocuments.length > 0 ? (
            recentDocuments.map((doc) => (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <a className="block px-6 py-2 hover:bg-gray-100">
                  <div className="flex items-center">
                    <FileText className="mr-3 h-4 w-4 text-gray-400" />
                    <span className="text-sm truncate">{doc.title}</span>
                  </div>
                </a>
              </Link>
            ))
          ) : (
            <div className="px-6 py-2 text-sm text-gray-500">
              {t("dashboard.noDocuments")}
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link href="/settings">
              <a className="flex items-center text-gray-700">
                <Settings className="mr-3 h-4 w-4" />
                <span>{t("app.settings")}</span>
              </a>
            </Link>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start mt-2" 
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="mr-3 h-4 w-4" />
            <span>{logoutMutation.isPending ? "Logging out..." : t("app.logout")}</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
