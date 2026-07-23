// ─── Job ID ───────────────────────────────────────────────────────────────────
// Produces a human-readable job ID from the auto-incremented job number.
// The number is global (not year-scoped) to avoid sequence resets.
// Display format: JOB-2026-000001
export function formatJobId(jobNumber: number, createdAt: Date): string {
  const year = createdAt.getFullYear();
  const padded = jobNumber.toString().padStart(6, "0");
  return `JOB-${year}-${padded}`;
}

// ─── Dates ────────────────────────────────────────────────────────────────────

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatTimeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

// ─── Numbers ──────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

export function formatQuantity(
  quantity: number | string,
  unit: string,
): string {
  const num = typeof quantity === "string" ? parseFloat(quantity) : quantity;
  return `${num % 1 === 0 ? num : num.toFixed(2)} ${unit}`;
}

// ─── Strings ──────────────────────────────────────────────────────────────────

export function formatRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim();
}
