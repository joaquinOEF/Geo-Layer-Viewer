import { Link } from "wouter";
import { Database, MapPin, ChevronDown } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { CITIES } from "@shared/cities";
import { useCity } from "@/lib/cityContext";

function CitySelector() {
  const { city, setCityId } = useCity();
  return (
    <div className="relative flex items-center" data-testid="select-city-wrapper">
      <MapPin className="w-3.5 h-3.5 text-white absolute left-2.5 pointer-events-none" />
      <select
        data-testid="select-city"
        value={city.id}
        onChange={(e) => setCityId(e.target.value)}
        className="appearance-none pl-8 pr-7 py-1.5 rounded-lg text-xs font-medium bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer outline-none"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        {CITIES.map((c) => (
          <option key={c.id} value={c.id} className="text-zinc-900">
            {c.name} — {c.region}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 text-white absolute right-2 pointer-events-none" />
    </div>
  );
}

export default function Header() {
  return (
    <header
      data-testid="header"
      className="h-14 flex items-center justify-between px-4 z-[1002] relative"
      style={{ backgroundColor: "#001fa8" }}
    >
      <div className="flex items-center gap-3">
        <a
          href="https://citycatalyst.openearth.dev"
          data-testid="link-citycatalyst-header"
          className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
        >
          <img src="/oef-logo.svg" alt="OpenEarth" className="w-6 h-6" />
        </a>

        <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>

        <span className="text-white text-sm font-medium tracking-wide" style={{ fontFamily: "Poppins, sans-serif" }}>
          Project Preparation Data Layers
        </span>
      </div>

      <div className="flex items-center gap-2">
        <CitySelector />
        <Link href="/data">
          <a
            data-testid="link-data-page"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            Data
          </a>
        </Link>
        <a
          href="https://github.com/joaquinOEF/Geo-Layer-Viewer"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-github-repo"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/15 hover:bg-white/25 text-white transition-colors"
        >
          <SiGithub className="w-3.5 h-3.5" />
          GitHub
        </a>
      </div>
    </header>
  );
}
