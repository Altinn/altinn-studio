/**
 * The contract every simulation honours. Kept in its own module so a slide can
 * import the type without pulling the scenes (and their CSS) in with it.
 */
export type SimProps = {
  /**
   * Legacy build-step position, kept so slides written against the old
   * clicker-driven contract keep compiling. The simulations run themselves
   * now, so the only thing this still does is pick the end state when
   * `autoplay` is off: `step > 0` means «show me the finished scene».
   */
  step?: number;
  /**
   * `false` freezes the scene on its end state and schedules no timers — used
   * for overview thumbnails and deterministic captures. Defaults to `true`,
   * which runs the whole scenario automatically on mount.
   */
  autoplay?: boolean;
};
