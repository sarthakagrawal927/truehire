const PALETTE: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1c40f",
  Python: "#3572a5",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#b07219",
  Kotlin: "#a97bff",
  Ruby: "#701516",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Swift: "#f05138",
  PHP: "#4f5d95",
  Elixir: "#6e4a7e",
  Scala: "#c22d40",
  HTML: "#e34c26",
  Shell: "#89e051",
  CSS: "#563d7c",
};

function colorFor(lang: string) {
  if (PALETTE[lang]) return PALETTE[lang];
  // deterministic hash fallback
  let h = 0;
  for (let i = 0; i < lang.length; i++) h = (h * 31 + lang.charCodeAt(i)) % 360;
  return `hsl(${h}, 48%, 55%)`;
}

type LangRow = { language: string; share: number };

export function LanguageBar({ languages }: { languages: LangRow[] }) {
  if (languages.length === 0) return null;
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {languages.map((l) => (
          <div
            key={l.language}
            style={{
              width: `${l.share * 100}%`,
              backgroundColor: colorFor(l.language),
            }}
            title={`${l.language} · ${(l.share * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {languages.map((l) => (
          <li
            key={l.language}
            className="flex items-center justify-between gap-3 text-[13px]"
          >
            <span className="flex items-center gap-2 text-[var(--foreground)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colorFor(l.language) }}
              />
              {l.language}
            </span>
            <span className="num text-[var(--muted)]">
              {(l.share * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
