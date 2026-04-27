export interface NavigationState {
  /**
   * When true, the navigation will not move focus on navigatiions.
   * Pair with `preventScrollReset` for navigations that should not disrupt the
   * user's current viewport.
   */
  preventFocusReset?: boolean;
}
