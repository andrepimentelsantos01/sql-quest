import { memo } from "react";

const GLOWS = [
  { className: "ambient-glow cyan", x: "-8%", y: "4%", duration: "20s", delay: "0s" },
  { className: "ambient-glow teal", x: "72%", y: "62%", duration: "24s", delay: "2s" },
  { className: "ambient-glow mint", x: "38%", y: "82%", duration: "26s", delay: "4s" },
];

function AmbientGlow() {
  return (
    <div className="ambient-glows">
      {GLOWS.map((glow) => (
        <span
          key={glow.className}
          className={glow.className}
          style={{
            left: glow.x,
            top: glow.y,
            "--glow-duration": glow.duration,
            "--glow-delay": glow.delay,
          }}
        />
      ))}
    </div>
  );
}

export default memo(AmbientGlow);
