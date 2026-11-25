import type { PropsWithChildren, ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioHeading, StudioParagraph } from '@designer/components';
import { XMarkIcon } from '@designer/icons';
import classes from './SettingsPanel.module.css';

export type SettingsPanelFrameProps = PropsWithChildren<{
  kicker: string;
  title: string;
  /** Buttons next to the close button, such as move up and down. */
  actions?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}>;

/** The frame of the full settings for a component or page: a header, sections and a footer. */
export function SettingsPanelFrame({
  kicker,
  title,
  actions,
  footer,
  onClose,
  children,
}: SettingsPanelFrameProps): ReactElement {
  const { t } = useTranslation();
  return (
    <section className={classes.panel} data-size='sm' aria-label={title}>
      <header className={classes.header}>
        <div className={classes.headerText}>
          <StudioParagraph data-size='xs' className={classes.kicker}>
            {kicker}
          </StudioParagraph>
          <StudioHeading level={2} data-size='xs'>
            {title}
          </StudioHeading>
        </div>
        {actions}
        <StudioButton
          variant='tertiary'
          data-size='sm'
          icon={<XMarkIcon />}
          title={t('app_builder.settings.close')}
          aria-label={t('app_builder.settings.close')}
          onClick={onClose}
        />
      </header>
      {children}
      {footer && <footer className={classes.footer}>{footer}</footer>}
    </section>
  );
}

export type SettingsSectionProps = PropsWithChildren<{
  title: string;
}>;

export function SettingsSection({ title, children }: SettingsSectionProps): ReactElement {
  return (
    <div className={classes.section}>
      <StudioHeading level={3} data-size='2xs'>
        {title}
      </StudioHeading>
      {children}
    </div>
  );
}
