export const STREAK_MILESTONES = [7, 30, 100, 365];

export async function fireConfetti() {
  if (typeof window === "undefined") return;
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
}
