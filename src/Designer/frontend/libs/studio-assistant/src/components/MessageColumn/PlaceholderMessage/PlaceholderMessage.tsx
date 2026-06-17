import type { ReactElement } from 'react';
import { StudioParagraph } from '@studio/components';
import type { EmptyThreadTexts } from '../../../types/AssistantTexts';
import classes from './PlaceholderMessage.module.css';

export type PlaceholderMessageProps = {
  texts: EmptyThreadTexts;
};

export function PlaceholderMessage({ texts }: PlaceholderMessageProps): ReactElement {
  return (
    <div className={classes.placeholderMessage}>
      <div className={classes.icon}>
        <span className={classes.bubble}>
          <span className={classes.dot}></span>
          <span className={classes.dot}></span>
          <span className={classes.dot}></span>
        </span>
      </div>
      <StudioParagraph data-size='lg'>{texts.welcome}</StudioParagraph>
      <StudioParagraph data-size='lg'>{texts.instruction}</StudioParagraph>
    </div>
  );
}
