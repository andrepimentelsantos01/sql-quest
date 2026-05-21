import { memo } from "react";

const PARTICLES = [
  { x: "8%", y: "18%", size: 4, delay: "0s", duration: "18s", drift: "22px" },
  { x: "18%", y: "72%", size: 3, delay: "1.8s", duration: "22s", drift: "-18px" },
  { x: "29%", y: "34%", size: 5, delay: "0.7s", duration: "20s", drift: "22px" },
  { x: "41%", y: "86%", size: 3, delay: "2.4s", duration: "24s", drift: "-18px" },
  { x: "56%", y: "20%", size: 4, delay: "1.1s", duration: "21s", drift: "22px" },
  { x: "66%", y: "62%", size: 5, delay: "3.1s", duration: "19s", drift: "-18px" },
  { x: "78%", y: "38%", size: 3, delay: "0.5s", duration: "23s", drift: "22px" },
  { x: "88%", y: "78%", size: 4, delay: "2.2s", duration: "20s", drift: "-18px" },
  { x: "94%", y: "14%", size: 3, delay: "1.4s", duration: "25s", drift: "22px" },
  { x: "12%", y: "48%", size: 2, delay: "3.6s", duration: "18s", drift: "-18px" },
  { x: "49%", y: "52%", size: 3, delay: "2.8s", duration: "22s", drift: "22px" },
  { x: "73%", y: "10%", size: 2, delay: "4.1s", duration: "24s", drift: "-18px" },
];

function ParticleField() {
  return (
    <div className="ambient-particles">
      {PARTICLES.map((particle) => (
        <span
          key={`${particle.x}-${particle.y}`}
          className="ambient-particle"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            "--particle-drift": particle.drift,
            "--particle-delay": particle.delay,
            "--particle-duration": particle.duration,
          }}
        />
      ))}
    </div>
  );
}

export default memo(ParticleField);
