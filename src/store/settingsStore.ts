import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface SettingsStore {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  sidebarOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  initTheme: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', resolved);
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  theme: (localStorage.getItem('mcq_theme') as Theme) || 'system',
  resolvedTheme: resolveTheme((localStorage.getItem('mcq_theme') as Theme) || 'system'),
  sidebarOpen: window.innerWidth > 1024,

  setTheme: (theme) => {
    const resolved = resolveTheme(theme);
    localStorage.setItem('mcq_theme', theme);
    applyTheme(resolved);
    set({ theme, resolvedTheme: resolved });
  },

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  initTheme: () => {
    const theme = get().theme;
    const resolved = resolveTheme(theme);
    applyTheme(resolved);
    set({ resolvedTheme: resolved });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (get().theme === 'system') {
        const resolved = getSystemTheme();
        applyTheme(resolved);
        set({ resolvedTheme: resolved });
      }
    });
  },
}));
