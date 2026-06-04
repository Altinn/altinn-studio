import { Alert as DesignsystemetAlert } from '@digdir/designsystemet-react';

// this eslint-disables will be fixed once this PR is merged:
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { useTranslation } from '../../LanguageTranslatorProvider';
import classes from './Alert.module.css';

export type AlertSeverity = 'success' | 'warning' | 'danger' | 'info';

function calculateAriaLive(severity: AlertSeverity): 'polite' | 'assertive' {
  if (severity === 'warning' || severity === 'danger') {
    return 'assertive';
  }
  return 'polite';
}

/**
 * Props that map 1:1 to the component's Studio-configurable options. These are the props an app
 * developer documents and experiments with in Storybook — see {@link ALERT_CONFIG_KEYS}.
 */
export interface AlertConfig {
  /** Text-resource key for the alert title. Resolved to plain text and shown above the body. */
  title?: string;
  /** Text-resource key for the alert body. Resolved with rich-text support. */
  body?: string;
  /** The severity of the alert, mapped to the design-system colour. */
  severity: AlertSeverity;
}

/**
 * Internal wiring supplied by the runtime wrapper. These are intentionally NOT part of the Studio
 * configuration and are hidden from the Storybook controls (only {@link ALERT_CONFIG_KEYS} are shown).
 */
export interface AlertControlProps {
  /**
   * When true the alert is announced to screen readers (`role="alert"` + `aria-live`). The wrapper
   * sets this when the component's `hidden` property is an expression, so a dynamically-revealed
   * alert is announced.
   */
  useAsAlert?: boolean;
  /** Overrides the announced label. Defaults to the resolved title. */
  ariaLabel?: string;
}

export interface AlertProps extends AlertConfig, AlertControlProps {}

/**
 * The configurable props, derived from {@link AlertConfig}. The `satisfies Record<...>` keeps this
 * list exhaustive: adding a prop to `AlertConfig` without listing it here is a compile error.
 * Storybook uses it (`controls.include`) to show controls for exactly the configurable props.
 */
export const ALERT_CONFIG_KEYS = Object.keys({
  title: true,
  body: true,
  severity: true,
} satisfies Record<keyof AlertConfig, true>) as (keyof AlertConfig)[];

export function Alert({ title, body, severity, useAsAlert, ariaLabel }: AlertProps) {
  const { lang, translate } = useTranslation();

  const titleText = title ? translate(title) : undefined;

  return (
    <DesignsystemetAlert
      className={classes.container}
      data-color={severity}
      role={useAsAlert ? 'alert' : undefined}
      aria-live={useAsAlert ? calculateAriaLive(severity) : undefined}
      aria-label={useAsAlert ? (ariaLabel ?? titleText) : undefined}
    >
      {titleText && <span className={classes.title}>{titleText}</span>}
      <div className={classes.body}>{body ? lang(body) : null}</div>
    </DesignsystemetAlert>
  );
}
