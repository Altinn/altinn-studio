import React from 'react';
import { StudioButton, StudioLabelAsParagraph } from '@studio/components';
import { ThumbDownFillIcon, ThumbDownIcon, ThumbUpFillIcon, ThumbUpIcon } from '@studio/icons';
import type { QuestionsProps } from '../../types/QuestionsProps';
import classes from './YesNoQuestion.module.css';

type YesNoQuestionProps = QuestionsProps & {
  buttonLabels: {
    yes: string;
    no: string;
  };
};

export function YesNoQuestion({ id, label, value, buttonLabels, onChange }: YesNoQuestionProps) {
  const setYes = () => {
    onChange(id, 'yes');
  };

  const setNo = () => {
    onChange(id, 'no');
  };

  const unsetYesOrNo = () => {
    onChange(id, '');
  };

  return (
    <div>
      <StudioLabelAsParagraph data-size='sm'>{label}</StudioLabelAsParagraph>
      <div className={classes.buttons}>
        <StudioButton
          variant='tertiary'
          icon={value === 'yes' ? <ThumbUpFillIcon /> : <ThumbUpIcon />}
          onClick={value === 'yes' ? unsetYesOrNo : setYes}
          aria-label={buttonLabels.yes}
          aria-selected={value === 'yes'}
        />
        <StudioButton
          variant='tertiary'
          icon={value === 'no' ? <ThumbDownFillIcon /> : <ThumbDownIcon />}
          onClick={value === 'no' ? unsetYesOrNo : setNo}
          aria-label={buttonLabels.no}
          aria-selected={value === 'no'}
        />
      </div>
    </div>
  );
}
