import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import { StudioDialog, StudioHeading, StudioLink, StudioParagraph } from '@studio/components';
import { ExternalLinkIcon, InformationIcon } from '@studio/icons';
import type { AboutAssistantDialogTexts } from '../../../types/AssistantTexts';

const branchDocsUrl =
  'https://docs.altinn.studio/nb/altinn-studio/v8/guides/development/branching/#flette-grener-til-master';

export const hasSeenDialogStorageKey = 'hasSeenAboutAssistantDialog';

type AboutAssistantDialogProps = {
  texts: AboutAssistantDialogTexts;
};

export function AboutAssistantDialog({ texts }: AboutAssistantDialogProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const hasSeenDialog = localStorage.getItem(hasSeenDialogStorageKey) === 'true';
    if (!hasSeenDialog) {
      dialogRef.current?.showModal();
    }
  }, []);

  const handleClose = (): void => localStorage.setItem(hasSeenDialogStorageKey, 'true');

  return (
    <StudioDialog.TriggerContext>
      <StudioDialog.Trigger variant='tertiary' icon={<InformationIcon />}>
        {texts.heading}
      </StudioDialog.Trigger>
      <StudioDialog closedby='any' ref={dialogRef} onClose={handleClose}>
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
          <StudioParagraph spacing>{texts.disclaimer}</StudioParagraph>
          <StudioParagraph>{texts.dataStorage}</StudioParagraph>
        </StudioDialog.Block>
      </StudioDialog>
    </StudioDialog.TriggerContext>
  );
}
