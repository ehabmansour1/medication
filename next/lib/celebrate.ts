const KEY = "celebrated_streak_milestones";
const MILESTONES = [7, 30, 100, 365];

function loadCelebrated(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((n) => typeof n === "number"));
  } catch {
    return new Set();
  }
}

function saveCelebrated(set: Set<number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export async function celebrateIfMilestone(streak: number): Promise<number | null> {
  if (typeof window === "undefined") return null;
  if (!MILESTONES.includes(streak)) return null;
  const seen = loadCelebrated();
  if (seen.has(streak)) return null;
  seen.add(streak);
  saveCelebrated(seen);
  // dynamic import keeps the dep out of initial bundle
  const confetti = (await import("canvas-confetti")).default;
  const end = Date.now() + 1200;
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 75,
      origin: { x: 0, y: 0.7 },
      colors: ["#e3b08d", "#d97757", "#87a96b", "#e6a572"],
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 75,
      origin: { x: 1, y: 0.7 },
      colors: ["#e3b08d", "#d97757", "#87a96b", "#e6a572"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  return streak;
}
