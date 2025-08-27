import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioParagraph } from 'libs/studio-components/src';
import type { TextResource } from 'libs/studio-components-legacy/src';
import { useConcatOptionListLabels } from '../hooks';
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
  const codeListLabels: string = useConcatOptionListLabels(optionList, textResources);

  return (
    <>
      <StudioParagraph className={classes.label}>
        {optionListId ?? t('ux_editor.modal_properties_code_list_custom_list')}
      </StudioParagraph>
      <StudioParagraph className={classes.codeListLabels} variant='short'>
        {codeListLabels}
      </StudioParagraph>
    </>
  );
}
