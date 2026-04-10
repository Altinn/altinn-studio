import type { ReactElement } from 'react';
import { StudioDialog, StudioHeading, StudioLink, StudioParagraph } from '@studio/components';
import { ExternalLinkIcon, InformationIcon } from '@studio/icons';
import type { AboutAssistantDialogTexts } from '../../../types/AssistantTexts';

const branchDocsUrl =
  'https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/branching/#flette-grener-til-master';

type AboutAssistantDialogProps = {
  triggerText: string;
  texts: AboutAssistantDialogTexts;
};

export function AboutAssistantDialog({
  triggerText,
  texts,
}: AboutAssistantDialogProps): ReactElement {
  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger variant='tertiary' icon={<InformationIcon />}>
        {triggerText}
      </StudioDialog.Trigger>
      <StudioDialog closedby='any'>
        <StudioDialog.Block>
          <StudioHeading level={2}>{texts.heading}</StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <StudioParagraph spacing>{texts.description}</StudioParagraph>
          <StudioParagraph spacing>
            {texts.branchInfo}
            <StudioLink target='_blank' rel='noopener noreferrer' href={branchDocsUrl}>
              <span>{texts.branchDocsLink}</span>
              <ExternalLinkIcon />
            </StudioLink>
          </StudioParagraph>
          <StudioParagraph>{texts.disclaimer}</StudioParagraph>
        </StudioDialog.Block>
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
}
