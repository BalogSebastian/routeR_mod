/**
 * Kis, statikus térkép-kivágás egy pont körül (OSM-csempék a saját proxyn át, 3×3 csempe).
 * Szürkeárnyalatos, a pont neonzöld jelölővel.
 */
const T = 256;

export default function MiniMap({ lat, lon, zoom = 15, className = "", label }: { lat: number; lon: number; zoom?: number; className?: string; label?: string }) {
  const n = 2 ** zoom;
  const xf = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const yf = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  const tx = Math.floor(xf), ty = Math.floor(yf);
  // a pont pixel-helye a 3×3-as rács közepén lévő csempén belül
  const px = (xf - tx) * T, py = (yf - ty) * T;
  const tiles: { x: number; y: number; dx: number; dy: number }[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push({ x: (tx + dx + n) % n, y: ty + dy, dx, dy });
  return (
    <div className={`relative overflow-hidden bg-[#e8e8e3] ${className}`} aria-label={label ? `Térkép: ${label}` : "Térkép"} role="img">
      <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(${-px - T}px, ${-py - T}px)` }}>
        {tiles.map((t) => (
          t.y >= 0 && t.y < n ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${t.dx},${t.dy}`} src={`/api/tiles/${zoom}/${t.x}/${t.y}.png`} alt="" width={T} height={T} loading="lazy" draggable={false}
              className="absolute max-w-none select-none [filter:grayscale(1)_contrast(1.05)_brightness(1.03)]" style={{ left: (t.dx + 1) * T, top: (t.dy + 1) * T }} />
          ) : null
        ))}
      </div>
      <span aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute -left-5 -top-5 h-10 w-10 animate-ping rounded-full bg-[#00ff9d]/50" />
        <span className="relative block h-4 w-4 rounded-full border-[3px] border-black bg-[#00ff9d] shadow-[0_0_0_3px_rgba(0,255,157,0.35)]" />
      </span>
    </div>
  );
}
