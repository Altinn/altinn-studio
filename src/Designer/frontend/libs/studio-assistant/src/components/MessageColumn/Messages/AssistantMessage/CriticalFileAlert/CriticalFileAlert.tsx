import type { ReactElement } from 'react';
import { StudioAlert, StudioHeading, StudioList, StudioParagraph } from '@studio/components';
import type { CriticalFileAlertTexts } from '../../../../../types/AssistantTexts';
import classes from './CriticalFileAlert.module.css';

export type CriticalFileAlertProps = {
  criticalFiles: string[];
  texts: CriticalFileAlertTexts;
};

export function CriticalFileAlert({ criticalFiles, texts }: CriticalFileAlertProps): ReactElement {
  return (
    <StudioAlert data-color='warning' className={classes.criticalFileAlert}>
      <StudioHeading data-size='2xs' level={4}>
        {texts.heading}
      </StudioHeading>
      <StudioParagraph>{texts.description}</StudioParagraph>
      <StudioList.Unordered>
        {criticalFiles.map((filePath) => (
          <StudioList.Item key={filePath}>{filePath}</StudioList.Item>
        ))}
      </StudioList.Unordered>
    </StudioAlert>
  );
}
