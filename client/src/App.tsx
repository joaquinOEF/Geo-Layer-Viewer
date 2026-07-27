import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MapViewer from "@/components/map/MapViewer";
import DataPage from "@/pages/DataPage";
import NotFound from "@/pages/not-found";
import { CityProvider, useCity } from "@/lib/cityContext";

// Remount the map when the city changes so Leaflet, layer state, and caches
// all reset cleanly for the new extent.
function CityKeyedMapViewer() {
  const { city } = useCity();
  return <MapViewer key={city.id} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={CityKeyedMapViewer} />
      <Route path="/data" component={DataPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CityProvider>
          <Toaster />
          <Router />
        </CityProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
