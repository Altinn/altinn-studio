import React, { useState } from 'react';
import {
  StudioButton,
  StudioDeleteButton,
  StudioProperty,
  StudioTextfield,
} from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import type { Option } from 'app-shared/types/Option';
import { XMarkIcon } from '@studio/icons';
import { TextResource } from '../../../../../../TextResource/TextResource';
import {
  deleteDescription,
  deleteHelpText,
  setDescription,
  setHelpText,
  setLabel,
  setValue,
} from './utils';
import classes from './EditOption.module.css';
import { OptionValue } from './OptionValue';

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

const ClosedOption = ({ legend, onOpen, option }: ClosedOptionProps) => (
  <StudioProperty.Button
    onClick={onOpen}
    property={legend}
    value={<OptionValue option={option} />}
  />
);

type OpenOptionProps = EditOptionProps & { onClose: () => void };

const OpenOption = ({ legend, onChange, option, onDelete, onClose }: OpenOptionProps) => {
  const { t } = useTranslation();

  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    onChange(setValue(option, event.target.value));

  const handleLabelChange = (textResourceId: string) => onChange(setLabel(option, textResourceId));

  const handleDescriptionChange = (textResourceId: string) =>
    onChange(setDescription(option, textResourceId));

  const handleHelpTextChange = (textResourceId: string) =>
    onChange(setHelpText(option, textResourceId));

  const handleDeleteDescription = () => onChange(deleteDescription(option));
  const handleDeleteHelpText = () => onChange(deleteHelpText(option));

  return (
    <StudioProperty.Fieldset
      legend={legend}
      menubar={<OptionMenu onClose={onClose} onDelete={onDelete} />}
    >
      <StudioTextfield
        className={classes.valueField}
        label={t('general.value')}
        onChange={handleValueChange}
        placeholder={t('general.value')}
        value={option.value.toString()}
      />
      <StudioProperty.Group className={classes.textResources}>
        <TextResource
          compact
          label={t('ux_editor.modal_properties_textResourceBindings_title')}
          handleIdChange={handleLabelChange}
          textResourceId={option.label}
        />
        <TextResource
          compact
          handleIdChange={handleDescriptionChange}
          handleRemoveTextResource={handleDeleteDescription}
          label={t('general.description')}
          textResourceId={option.description}
        />
        <TextResource
          compact
          handleIdChange={handleHelpTextChange}
          handleRemoveTextResource={handleDeleteHelpText}
          label={t('ux_editor.modal_properties_textResourceBindings_help')}
          textResourceId={option.helpText}
        />
      </StudioProperty.Group>
    </StudioProperty.Fieldset>
  );
};

type OptionMenuProps = {
  onClose: () => void;
  onDelete: () => void;
};

const OptionMenu = ({ onClose, onDelete }: OptionMenuProps) => {
  const { t } = useTranslation();
  return (
    <>
      <StudioButton
        icon={<XMarkIcon />}
        onClick={onClose}
        title={t('general.close')}
        variant='secondary'
      />
      <StudioDeleteButton onDelete={onDelete} title={t('general.delete')} />
    </>
  );
};
