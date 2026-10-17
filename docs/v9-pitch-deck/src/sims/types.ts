/**
 * The contract every scenario honours. Kept in its own module so a slide can
 * import the type without pulling the scenes (and their CSS) in with it.
 */
export type SimProps = {
  /** The deck's build step for the slide; one step lands one line. */
  step: number;
};
