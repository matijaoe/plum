const DURATIONS = [0.8, 0.55, 0.7];

interface EqualizerProps {
  height?: number;
  barWidth?: string;
  color?: string;
}

export function Equalizer({
  height = 12,
  barWidth = "2px",
  color = "bg-white/60",
}: EqualizerProps) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {DURATIONS.map((duration, i) => (
        <div
          key={i}
          className={`rounded-full ${color}`}
          style={{
            width: barWidth,
            height: "100%",
            transformOrigin: "bottom",
            animation: `eq-bar ${duration}s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
