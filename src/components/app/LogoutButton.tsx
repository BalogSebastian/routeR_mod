"use client";

export default function LogoutButton({ className = "btn", children = "Kilépés" }: { className?: string; children?: React.ReactNode }) {
  return (
    <button
      className={className}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        // teljes oldalbetöltés: a friss munkamenet-sütivel indul az új oldal
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
      }}
    >
      {children}
    </button>
  );
}
