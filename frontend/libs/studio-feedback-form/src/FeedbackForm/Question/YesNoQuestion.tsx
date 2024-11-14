import React from 'react';
import { StudioButton, StudioParagraph } from '@studio/components';
import { ThumbDownFillIcon, ThumbDownIcon, ThumbUpFillIcon, ThumbUpIcon } from '@studio/icons';
import type { QuestionsProps } from '../../types/QuestionsProps';

export function YesNoQuestion({ id, label, onChange }: QuestionsProps) {
  const [yesOrNo, setYesOrNo] = React.useState<'yes' | 'no' | undefined>(undefined);

  const setYes = () => {
    setYesOrNo('yes');
    onChange(id, 'yes');
  };

  const setNo = () => {
    setYesOrNo('no');
    onChange(id, 'no');
  };

  const unsetYesOrNo = () => {
    setYesOrNo(undefined);
    onChange(id, undefined);
  };

  return (
    <div>
      <StudioParagraph>{label}</StudioParagraph>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
        {yesOrNo !== 'yes' && (
          <StudioButton variant='tertiary' size='lg' icon={<ThumbUpIcon />} onClick={setYes} />
        )}
        {yesOrNo === 'yes' && (
          <StudioButton
            variant='tertiary'
            size='lg'
            icon={<ThumbUpFillIcon />}
            onClick={unsetYesOrNo}
          />
        )}
        {yesOrNo !== 'no' && (
          <StudioButton variant='tertiary' size='lg' icon={<ThumbDownIcon />} onClick={setNo} />
        )}
        {yesOrNo === 'no' && (
          <StudioButton
            variant='tertiary'
            size='lg'
            icon={<ThumbDownFillIcon />}
            onClick={unsetYesOrNo}
          />
        )}
      </div>
    </div>
  );
}
