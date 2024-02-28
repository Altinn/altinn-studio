import React, { ChangeEvent } from 'react';
import { TextResourceEditor } from '../../../TextResource/TextResourceEditor';
import { StudioDeleteButton, StudioTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { Option } from 'app-shared/types/Option';

export type EditOptionProps = {
  legend: string;
  onChange: (option: Option<string>) => void;
  option: Option<string>;
  onDelete: () => void;
};

export const EditOption = ({ onChange, option, legend, onDelete }: EditOptionProps) => {
  const { t } = useTranslation();

  const handleValueChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...option, value: event.target.value });

  const handleTextReferenceChange = (textResourceId: string) =>
    onChange({ ...option, label: textResourceId });

  return (
    <fieldset>
      <legend>{legend}</legend>
      <StudioDeleteButton onDelete={onDelete} />
      <StudioTextfield
        label={t('general.value')}
        onChange={handleValueChange}
        placeholder={t('general.value')}
        value={option.value.toString()}
      />
      <TextResourceEditor
        onReferenceChange={handleTextReferenceChange}
        textResourceId={option.label}
      />
    </fieldset>
  );
};
