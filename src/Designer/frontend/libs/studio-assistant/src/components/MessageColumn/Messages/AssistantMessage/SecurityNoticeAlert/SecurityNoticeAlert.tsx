import type { ReactElement } from 'react';
import { StudioAlert, StudioHeading, StudioParagraph } from '@studio/components';
import type { SecurityNoticeAlertTexts } from '../../../../../types/AssistantTexts';
import classes from './SecurityNoticeAlert.module.css';

export type SecurityNoticeAlertProps = {
  texts: SecurityNoticeAlertTexts;
};

export function SecurityNoticeAlert({ texts }: SecurityNoticeAlertProps): ReactElement {
  return (
    <StudioAlert data-color='warning' className={classes.securityNoticeAlert}>
      <StudioHeading data-size='2xs' level={4}>
        {texts.heading}
      </StudioHeading>
      <StudioParagraph>{texts.description}</StudioParagraph>
    </StudioAlert>
  );
}
