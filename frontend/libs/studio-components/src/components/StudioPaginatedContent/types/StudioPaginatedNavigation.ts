export type StudioPaginatedNavigation = {
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  onNext: () => void;
  onPrevious: () => void;
};
