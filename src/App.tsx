import { useWeatherStore } from "@/lib/store";
import HomePage from "@/pages/HomePage";
import SourcesPage from "@/pages/SourcesPage";
import SettingsPage from "@/pages/SettingsPage";
import NavBar from "@/components/NavBar";

export default function App() {
  const page = useWeatherStore((s) => s.page);

  return (
    <div className="h-dvh flex flex-col bg-[var(--color-bg)] safe-bottom">
      <main className="flex-1 overflow-y-auto">
        {page === "home" && <HomePage />}
        {page === "sources" && <SourcesPage />}
        {page === "settings" && <SettingsPage />}
      </main>
      <NavBar />
    </div>
  );
}
