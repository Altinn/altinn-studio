import React from 'react';
import { StudioButton, StudioParagraph } from '@studio/components';
import { ThumbDownFillIcon, ThumbDownIcon, ThumbUpFillIcon, ThumbUpIcon } from '@studio/icons';
import type { QuestionsProps } from '../../types/QuestionsProps';

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
      <StudioParagraph>{label}</StudioParagraph>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
        {value !== 'yes' && (
          <StudioButton
            variant='tertiary'
            size='lg'
            icon={<ThumbUpIcon />}
            onClick={setYes}
            aria-label={buttonLabels.yes}
          />
        )}
        {value === 'yes' && (
          <StudioButton
            variant='tertiary'
            size='lg'
            icon={<ThumbUpFillIcon />}
            onClick={unsetYesOrNo}
            aria-label={buttonLabels.yes}
            aria-selected={true}
          />
        )}
        {value !== 'no' && (
          <StudioButton
            variant='tertiary'
            size='lg'
            icon={<ThumbDownIcon />}
            onClick={setNo}
            aria-label={buttonLabels.no}
          />
        )}
        {value === 'no' && (
          <StudioButton
            variant='tertiary'
            size='lg'
            icon={<ThumbDownFillIcon />}
            onClick={unsetYesOrNo}
            aria-label={buttonLabels.no}
            aria-selected={true}
          />
        )}
      </div>
    </div>
  );
}
