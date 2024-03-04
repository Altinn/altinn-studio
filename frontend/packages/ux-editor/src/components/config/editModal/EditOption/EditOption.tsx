import React, { ChangeEvent, useState } from 'react';
import { TextResourceEditor } from '../../../TextResource/TextResourceEditor';
import {
  StudioButton,
  StudioDeleteButton,
  StudioPropertyButton,
  StudioTextfield,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import { Option } from 'app-shared/types/Option';
import { XMarkIcon } from '@navikt/aksel-icons';
import { TextResource } from '../../../TextResource/TextResource';

export type EditOptionProps = {
  legend: string;
  onChange: (option: Option<string>) => void;
  option: Option<string>;
  onDelete: () => void;
};

export const EditOption = (props: EditOptionProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return isOpen ? (
    <OpenOption {...props} onClose={close} />
  ) : (
    <ClosedOption {...props} onOpen={open} />
  );
};

type ClosedOptionProps = EditOptionProps & { onOpen: () => void };

const ClosedOption = ({ legend, onOpen, option }: ClosedOptionProps) => {
  return <StudioPropertyButton property={legend} onClick={onOpen} value={option.value} />;
};

type OpenOptionProps = EditOptionProps & { onClose: () => void };

const OpenOption = ({ legend, onChange, option, onDelete, onClose }: OpenOptionProps) => {
  const { t } = useTranslation();

  const handleValueChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...option, value: event.target.value });

  const handleTextReferenceChange = (textResourceId: string) =>
    onChange({ ...option, label: textResourceId });

  return (
    <fieldset>
      <legend>{legend}</legend>
      <StudioButton icon={<XMarkIcon />} onClick={onClose} size='small' variant='secondary' />
      <StudioDeleteButton onDelete={onDelete} />
      <StudioTextfield
        label={t('general.value')}
        onChange={handleValueChange}
        placeholder={t('general.value')}
        value={option.value.toString()}
      />
      <TextResource onReferenceChange={handleTextReferenceChange} textResourceId={option.label} />
    </fieldset>
  );
};
