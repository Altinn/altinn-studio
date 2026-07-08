import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { Alert as DsAlert } from '@digdir/designsystemet-react';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './Alert.module.css';

export type AlertSeverity = 'success' | 'warning' | 'danger' | 'info';

// Critical severities use role="alert" (implicit assertive live region), others use the less
// intrusive role="status" (implicit polite live region). We deliberately do not also set aria-live:
// combining it with role="alert"/"status" causes double announcements in VoiceOver on iOS.
// See https://designsystemet.no/no/components/docs/alert/accessibility
function calculateRole(severity: AlertSeverity): 'alert' | 'status' {
  if (severity === 'warning' || severity === 'danger') {
    return 'alert';
  }
  return 'status';
}

export interface AlertProps {
  /** The indexed component ID; drives the form-content wrapper. */
  componentId: string;
  /** Severity of the alert; controls the colour and the screen-reader role. */
  severity: AlertSeverity;
  /** Text resource key for the alert title. */
  title?: string;
  /** Text resource key for the alert body. */
  body?: string;
  /**
   * When true, the alert is exposed to screen readers as a live region (role `alert`/`status`).
   * The wrapper sets this when the component's `hidden` property is an expression, so that the
   * alert is announced whenever it becomes visible.
   */
  useAsAlert?: boolean;
  /** Overrides the aria-label used when announced as a live region (defaults to the title). */
  ariaLabel?: string;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
}

export function Alert({
  componentId,
  severity,
  title,
  body,
  useAsAlert,
  ariaLabel,
  innerGrid,
}: AlertProps) {
  const { lang, langAsString } = useTranslation();

  const titleString = title ? langAsString(title) : undefined;

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <DsAlert
        className={classes.container}
        data-color={severity}
        role={useAsAlert ? calculateRole(severity) : undefined}
        aria-label={useAsAlert ? (ariaLabel ?? titleString) : undefined}
      >
        {titleString && <span className={classes.title}>{titleString}</span>}
        <div className={classes.body}>{body && lang(body)}</div>
      </DsAlert>
    </ComponentStructure>
  );
}
