export interface Profile {
  achievements: string[];
  endings: string[];
  runs: number;
}

const KEY = "astro-chaos:v3:profile";

export function loadProfile(): Profile {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return { achievements: raw.achievements ?? [], endings: raw.endings ?? [], runs: raw.runs ?? 0 };
  } catch {
    return { achievements: [], endings: [], runs: 0 };
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify(p));
}
