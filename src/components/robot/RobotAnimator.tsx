import CivicAIRobot, { RobotState } from "./CivicAIRobot";

interface RobotAnimatorProps {
  state: RobotState;
  loading?: boolean;
  isInComplaintMode?: boolean;
}

export default function RobotAnimator({ state, loading = false, isInComplaintMode = false }: RobotAnimatorProps) {
  // isWritingActive: true when complaint mode is active and robot is in writing/processing
  const isWritingActive = isInComplaintMode && (state === "writing" || state === "streaming" || loading);

  return (
    <div className="relative w-[75px] h-[105px] md:w-[90px] md:h-[125px] flex items-center justify-center select-none overflow-visible">
      {/* Subtle soft ambient radial glow behind the companion */}
      <div className="absolute w-24 h-24 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.1)_0%,transparent_65%)] pointer-events-none z-0" />

      {/* Animated companion */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <CivicAIRobot state={state} isWritingActive={isWritingActive} />
      </div>
    </div>
  );
}
