import { FormStore } from 'src/features/form/FormContext';
import { useUiPreferences } from 'src/features/form/layout/UiPreferencesContext';
import { usePageSettings } from 'src/features/form/layoutSettings/processLayoutSettings';
import { useCurrentView } from 'src/hooks/useNavigatePage';

/**
 * The width configured for the current page: its own `expandedWidth`, falling back to the task's
 * Settings.json, falling back to the default. The layout is read laxly because tasks that render no
 * form (confirmation, feedback, waiting service tasks) have no page to override it.
 */
function useConfiguredWidth(): boolean {
  const currentPageId = useCurrentView();
  const layouts = FormStore.bootstrap.useLaxLayoutCollection();
  const fromLayout = currentPageId ? layouts?.[currentPageId]?.data.expandedWidth : undefined;
  const fromSettings = usePageSettings().expandedWidth;

  return fromLayout ?? fromSettings ?? false;
}

/**
 * Whether the page renders at expanded width, and the toggle behind the expand button. A width the
 * user picked wins, but only where the button is offered; elsewhere the task's configuration
 * applies. The preference is kept rather than reset, so it returns when the user does.
 */
export function useExpandedWidth(): { expandedWidth: boolean; toggleExpandedWidth: () => void } {
  const { showExpandWidthButton } = usePageSettings();
  const { userPrefersExpandedWidth, setUserPrefersExpandedWidth } = useUiPreferences();
  const configured = useConfiguredWidth();
  const expandedWidth = showExpandWidthButton ? (userPrefersExpandedWidth ?? configured) : configured;

  return {
    expandedWidth,
    // Flips the width the user can currently see rather than their previous preference, so the
    // first click on a page configured as expanded collapses it.
    toggleExpandedWidth: () => setUserPrefersExpandedWidth(!expandedWidth),
  };
}
