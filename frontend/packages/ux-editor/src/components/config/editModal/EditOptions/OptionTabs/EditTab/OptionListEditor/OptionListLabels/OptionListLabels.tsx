import React from 'react';
import { StudioParagraph } from '@studio/components';
import type { OptionListEditorProps } from '../OptionListEditor';
import type { Option } from 'app-shared/types/Option';
import { useConcatOptionsLabels } from '../hooks/useConcatOptionsLabels';
import classes from './OptionListLabels.module.css';
import { useTranslation } from 'react-i18next';

type LibraryOptionsEditorProps = { optionsList: Option[] } & Pick<
  OptionListEditorProps,
  'component'
>;

export function OptionListLabels({
  component,
  optionsList,
}: LibraryOptionsEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const codeListLabels: string = useConcatOptionsLabels(optionsList);

  return (
    <>
      <StudioParagraph className={classes.label}>
        {component.optionsId
          ? component.optionsId
          : t('ux_editor.modal_properties_code_list_custom_list')}
      </StudioParagraph>
      <StudioParagraph size='sm' className={classes.codeListLabels} variant='short'>
        {codeListLabels}
      </StudioParagraph>
    </>
  );
}
