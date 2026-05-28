import type { ReactNode } from 'react';

import { Paragraph as DSParagraph } from '@digdir/designsystemet-react';

import { HelpText } from '../../app-components/HelpText/HelpText';
import classes from './Paragraph.module.css';

export interface ParagraphProps {
  id?: string;
  title: ReactNode;
  titleIsInline?: boolean;
  helpText?: ReactNode;
  helpTitle?: string;
  helpTitlePrefix?: string;
}

export function Paragraph({ id, title, titleIsInline, helpText, helpTitle, helpTitlePrefix }: ParagraphProps) {
  return (
    <div className={classes.paragraphWrapper}>
      <div
        id={id}
        data-testid={`paragraph-component-${id}`}
      >
        <DSParagraph asChild={!titleIsInline}>{titleIsInline ? title : <div>{title}</div>}</DSParagraph>
      </div>
      {helpText && (
        <HelpText
          id={id ? `${id}-helptext` : undefined}
          titlePrefix={helpTitlePrefix}
          title={helpTitle}
        >
          {helpText}
        </HelpText>
      )}
    </div>
  );
}
