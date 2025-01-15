import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioParagraph } from '@studio/components';
import { useConcatOptionsLabels } from '../hooks/useConcatOptionsLabels';
import type { OptionList } from 'app-shared/types/OptionList';
import classes from './OptionListLabels.module.css';

type OptionListLabelsProps = { optionsList: OptionList; optionsId: string };

export function OptionListLabels({
  optionsList,
  optionsId,
}: OptionListLabelsProps): React.ReactNode {
  const { t } = useTranslation();
  const codeListLabels: string = useConcatOptionsLabels(optionsList);

  return (
    <>
      <StudioParagraph size='sm' className={classes.label}>
        {optionsId ?? t('ux_editor.modal_properties_code_list_custom_list')}
      </StudioParagraph>
      <StudioParagraph size='sm' className={classes.codeListLabels} variant='short'>
        {codeListLabels}
      </StudioParagraph>
    </>
  );
}
