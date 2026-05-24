import { memo } from "react";
import AnimatedGridOverlay from "./AnimatedGridOverlay";

function GameAmbientEffects() {
  return (
    <div className="game-ambient-effects" aria-hidden="true">
      <AnimatedGridOverlay />
    </div>
  );
}

export default memo(GameAmbientEffects);
