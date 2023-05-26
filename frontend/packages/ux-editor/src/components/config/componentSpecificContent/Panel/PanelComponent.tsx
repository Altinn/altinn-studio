import React from 'react';
import { Checkbox, Select } from '@digdir/design-system-react';
import type { IGenericEditComponent } from '../../componentConfig';
import { useText } from '../../../../hooks';
import { EditTextResourceBinding } from '../../editModal/EditTextResourceBinding';
import { FormPanelVariant } from '../../../../types/FormComponent';

export const PanelComponent = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const t = useText();

  const handleShowIconClick = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleComponentChange({ ...component, showIcon: e.target.checked });
  }

  const handleVariantClick = (value: FormPanelVariant) => {
    handleComponentChange({ ...component, variant: value });
  }

  return (
    <>
      <EditTextResourceBinding
        component={component}
        handleComponentChange={handleComponentChange}
        textKey='body'
        labelKey='ux_editor.modal_text_resource_body'
      />
      <Checkbox
        label={t('ux_editor.show_icon')}
        onChange={handleShowIconClick}
        checked={component?.showIcon}
      />
      <Select
        label={t('ux_editor.choose_variant')}
        options={Object.values(FormPanelVariant).map((value: FormPanelVariant) => ({
          label: t(`ux_editor.${value}`),
          value,
        }))}
        onChange={handleVariantClick}
        value={component.variant || 'info'}
      />
    </>
  );
};
