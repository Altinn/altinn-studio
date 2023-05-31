import React, { useEffect, useState } from 'react';
import { idExists, validComponentId } from '../../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { useFormLayoutsSelector } from '../../../hooks';
import { selectedLayoutSelector } from '../../../selectors/formLayoutSelectors';
import type { FormComponent } from '../../../types/FormComponent';
import { TextFieldWithValidation } from '../../TextFieldWithValidation';

export interface IEditComponentId {
  handleComponentUpdate: React.Dispatch<React.SetStateAction<FormComponent>>;
  component: FormComponent;
}
export const EditComponentId = ({ component, handleComponentUpdate }: IEditComponentId) => {
  const [tmpId, setTmpId] = useState<string>(component?.id || '');
  const { components, containers } = useFormLayoutsSelector(selectedLayoutSelector);
  const { t } = useTranslation();

  useEffect(() => {
    setTmpId(component?.id);
  }, [component?.id]);

  const handleNewId = (_, error) => {
    if (!error) {
      handleComponentUpdate((prevState: FormComponent) => ({
        ...prevState,
        id: tmpId,
      }));
    }
  };

  const handleIdChange = (event: any) => {
    const newId = event.target.value;
    setTmpId(newId);
  };

  return (
    <div>
      <TextFieldWithValidation
        label={t('ux_editor.modal_properties_component_change_id')}
        name={`component-id-input${component.id}`}
        value={tmpId}
        validation={{
          required: {
            message: t('validation_errors.required'),
          },
          custom: (value) => {
            if (idExists(value, components, containers) && value !== component.id) {
              return t('ux_editor.modal_properties_component_id_not_unique_error');
            } else if (!value || !validComponentId.test(value)) {
              return t('ux_editor.modal_properties_component_id_not_valid');
            }
          }
        }}
        onChange={handleIdChange}
        onBlur={handleNewId}
      />
    </div>
  );
};
