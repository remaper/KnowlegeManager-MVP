import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Documents from "@/pages/documents";
import DocumentDetail from "@/pages/document-detail";
import SemanticNetwork from "@/pages/semantic-network";
import OntologyPage from "@/pages/ontology";
import Recommendations from "@/pages/recommendations";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/documents" component={Documents} />
      <ProtectedRoute path="/documents/:id" component={DocumentDetail} />
      <ProtectedRoute path="/semantic-network" component={SemanticNetwork} />
      <ProtectedRoute path="/ontology" component={OntologyPage} />
      <ProtectedRoute path="/recommendations" component={Recommendations} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
