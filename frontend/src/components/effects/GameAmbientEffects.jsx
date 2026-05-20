import AmbientGlow from "./AmbientGlow";
import AnimatedGridOverlay from "./AnimatedGridOverlay";
import FloatingSqlTokens from "./FloatingSqlTokens";
import ParticleField from "./ParticleField";
import ScanlineEffect from "./ScanlineEffect";

export default function GameAmbientEffects() {
  return (
    <div className="game-ambient-effects" aria-hidden="true">
      <AnimatedGridOverlay />
      <AmbientGlow />
      <ParticleField />
      <FloatingSqlTokens />
      <ScanlineEffect />
    </div>
  );
}
