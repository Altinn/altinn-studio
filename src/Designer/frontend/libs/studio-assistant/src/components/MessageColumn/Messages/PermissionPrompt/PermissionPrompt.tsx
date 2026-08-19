import type { ReactElement } from 'react';
import { StudioAlert, StudioButton, StudioHeading, StudioParagraph } from '@studio/components';
import type { PermissionPromptTexts } from '../../../../types/AssistantTexts';
import classes from './PermissionPrompt.module.css';

export type PermissionPromptProps = {
  message: string;
  texts: PermissionPromptTexts;
  onRespond: (granted: boolean) => void;
};

/**
 * Inline consent prompt shown when the agent, in a read-only session, asks
 * to make changes in the app. The workflow is paused until the user answers.
 */
export function PermissionPrompt({
  message,
  texts,
  onRespond,
}: PermissionPromptProps): ReactElement {
  return (
    <StudioAlert data-color='info' className={classes.permissionPrompt}>
      <StudioHeading data-size='2xs' level={4}>
        {texts.heading}
      </StudioHeading>
      <StudioParagraph>{message}</StudioParagraph>
      <div className={classes.actions}>
        <StudioButton variant='primary' onClick={() => onRespond(true)}>
          {texts.allow}
        </StudioButton>
        <StudioButton variant='secondary' onClick={() => onRespond(false)}>
          {texts.deny}
        </StudioButton>
      </div>
    </StudioAlert>
  );
}
