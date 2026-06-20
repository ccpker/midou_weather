import { useWeatherStore } from "@/lib/store";
import HomePage from "@/pages/HomePage";
import SourcesPage from "@/pages/SourcesPage";
import SettingsPage from "@/pages/SettingsPage";
import NavBar from "@/components/NavBar";
import { WeatherBackground } from "@/components/WeatherBackground";

export default function App() {
  const page = useWeatherStore((s) => s.page);

  return (
    <div className="h-dvh flex flex-col relative overflow-hidden">
      <WeatherBackground />
      <main className="flex-1 overflow-y-auto relative z-10 scrollbar-hide safe-area-top">
        <div className="animate-fade-in" key={page}>
          {page === "home" && <HomePage />}
          {page === "sources" && <SourcesPage />}
          {page === "settings" && <SettingsPage />}
        </div>
      </main>
      <NavBar />
    </div>
  );
}
