import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioParagraph } from '@studio/components-legacy';
import type { TextResource } from '@studio/components-legacy';
import { useConcatOptionsLabels } from '../hooks';
import type { OptionList } from 'app-shared/types/OptionList';
import classes from './OptionListLabels.module.css';

type OptionListLabelsProps = {
  optionList: OptionList;
  optionListId: string;
  textResources: TextResource[];
};

export function OptionListLabels({
  optionList,
  optionListId,
  textResources,
}: OptionListLabelsProps): React.ReactNode {
  const { t } = useTranslation();
  const codeListLabels: string = useConcatOptionsLabels(optionList, textResources);

  return (
    <>
      <StudioParagraph size='sm' className={classes.label}>
        {optionListId ?? t('ux_editor.modal_properties_code_list_custom_list')}
      </StudioParagraph>
      <StudioParagraph size='sm' className={classes.codeListLabels} variant='short'>
        {codeListLabels}
      </StudioParagraph>
    </>
  );
}
