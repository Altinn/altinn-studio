import type { ReactElement } from 'react';
import { StudioAlert, StudioHeading, StudioParagraph } from '@studio/components';
import type { CriticalFileAlertTexts } from '../../../../../types/AssistantTexts';
import classes from './CriticalFileAlert.module.css';

export type CriticalFileAlertProps = {
  criticalFiles: string[];
  texts: CriticalFileAlertTexts;
};

export function CriticalFileAlert({ criticalFiles, texts }: CriticalFileAlertProps): ReactElement {
  return (
    <StudioAlert data-color='warning' className={classes.criticalFileAlert}>
      <StudioHeading data-size='2xs' level={4} spacing>
        {texts.heading}
      </StudioHeading>
      <StudioParagraph>{texts.description}</StudioParagraph>
      <ul className={classes.fileList}>
        {criticalFiles.map((filePath) => (
          <li key={filePath}>{filePath}</li>
        ))}
      </ul>
    </StudioAlert>
  );
}
