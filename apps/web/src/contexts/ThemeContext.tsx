import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

type Theme = 'light' | 'dark' | 'system';
export type AccentKey =
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'orange'
  | 'red'
  | 'rose'
  | 'custom';

export interface AccentOption {
  key: Exclude<AccentKey, 'custom'>;
  label: string;
  hue: number;
  saturation: number;
  swatch: string;
}

export interface AccentStyle {
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
}

/** Preset warna aksen. Hijau soft menjadi default. */
export const ACCENT_OPTIONS: AccentOption[] = [
  { key: 'green', label: 'Hijau Soft', hue: 152, saturation: 46, swatch: 'hsl(152, 46%, 38%)' },
  { key: 'teal', label: 'Teal', hue: 174, saturation: 58, swatch: 'hsl(174, 58%, 34%)' },
  { key: 'blue', label: 'Biru', hue: 217, saturation: 70, swatch: 'hsl(217, 70%, 50%)' },
  { key: 'purple', label: 'Ungu', hue: 262, saturation: 58, swatch: 'hsl(262, 58%, 55%)' },
  { key: 'rose', label: 'Pink', hue: 340, saturation: 65, swatch: 'hsl(340, 65%, 52%)' },
  { key: 'red', label: 'Merah', hue: 0, saturation: 72, swatch: 'hsl(0, 72%, 50%)' },
  { key: 'orange', label: 'Oranye', hue: 25, saturation: 85, swatch: 'hsl(25, 85%, 50%)' },
];

const DEFAULT_CUSTOM = '#2f9e6e';

const hsl = (h: number, s: number, l: number) =>
  `${h.toFixed(1)} ${Math.round(s)}% ${Math.round(l)}%`;

function hexToHsl(hex: string): { h: number; s: number } {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.substring(0, 2), 16) / 255;
  const g = parseInt(full.substring(2, 4), 16) / 255;
  const b = parseInt(full.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return { h: h * 360, s: s * 100 };
}

function getAccentStyle(
  accent: AccentKey,
  customColor: string,
  dark: boolean,
): AccentStyle {
  let hue: number;
  let saturation: number;

  if (accent === 'custom') {
    const parsed = hexToHsl(customColor);
    hue = parsed.h;
    saturation = Math.max(35, Math.min(parsed.s, 75));
  } else {
    const option = ACCENT_OPTIONS.find((o) => o.key === accent) ?? ACCENT_OPTIONS[0];
    hue = option.hue;
    saturation = option.saturation;
  }

  return {
    primary: hsl(hue, saturation, dark ? 55 : 38),
    primaryForeground: dark ? hsl(hue, 30, 8) : '0 0% 100%',
    accent: hsl(hue, dark ? 22 : 45, dark ? 18 : 95),
    accentForeground: dark ? '0 0% 98%' : hsl(hue, 45, 20),
    ring: hsl(hue, saturation, dark ? 55 : 38),
  };
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  accent: AccentKey;
  setAccent: (accent: AccentKey) => void;
  customColor: string;
  setCustomColor: (hex: string) => void;
  accentStyle: AccentStyle;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [accent, setAccentState] = useState<AccentKey>(() => {
    return (localStorage.getItem('accentColor') as AccentKey) || 'green';
  });
  const [customColor, setCustomColorState] = useState<string>(() => {
    return localStorage.getItem('customAccentColor') || DEFAULT_CUSTOM;
  });

  const resolveTheme = useCallback((t: Theme) => {
    if (t === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setResolvedTheme(prefersDark ? 'dark' : 'light');
    } else {
      setResolvedTheme(t);
    }
  }, []);

  useEffect(() => {
    resolveTheme(theme);
  }, [theme, resolveTheme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const accentStyle = useMemo(
    () => getAccentStyle(accent, customColor, resolvedTheme === 'dark'),
    [accent, customColor, resolvedTheme],
  );

  // Inline style pada <html> mengalahkan nilai :root/.dark di CSS,
  // sehingga warna pilihan pengguna berlaku di kedua mode.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', accentStyle.primary);
    root.style.setProperty('--primary-foreground', accentStyle.primaryForeground);
    root.style.setProperty('--accent', accentStyle.accent);
    root.style.setProperty('--accent-foreground', accentStyle.accentForeground);
    root.style.setProperty('--ring', accentStyle.ring);
  }, [accentStyle]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
  };

  const setAccent = (key: AccentKey) => {
    setAccentState(key);
    localStorage.setItem('accentColor', key);
  };

  const setCustomColor = (hex: string) => {
    setCustomColorState(hex);
    localStorage.setItem('customAccentColor', hex);
    setAccentState('custom');
    localStorage.setItem('accentColor', 'custom');
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedTheme,
        accent,
        setAccent,
        customColor,
        setCustomColor,
        accentStyle,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
