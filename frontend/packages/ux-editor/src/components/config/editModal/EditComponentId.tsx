import React, { useEffect, useRef, useState } from 'react';
import { idExists } from '../../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { useSelectedFormLayout } from '../../../hooks';
import type { FormComponent } from '../../../types/FormComponent';
import { FormField } from '../../FormField';
import { Textfield } from '@digdir/design-system-react';
import { PencilIcon, KeyVerticalIcon } from '@studio/icons';
import { StudioButton } from '@studio/components';
import classes from './EditComponentId.module.css';

export interface IEditComponentId {
  handleComponentUpdate: (component: FormComponent) => void;
  component: FormComponent;
  helpText?: string;
}
export const EditComponentId = ({
  component,
  handleComponentUpdate,
  helpText,
}: IEditComponentId) => {
  const { components, containers } = useSelectedFormLayout();
  const { t } = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);

  const handleIdChange = (id: string) => {
    handleComponentUpdate({
      ...component,
      id,
    });
  };

  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsEditMode(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <FormField
      id={component.id}
      label={t('ux_editor.modal_properties_component_change_id')}
      value={component.id}
      onChange={handleIdChange}
      propertyPath='definitions/component/properties/id'
      componentType={component.type}
      helpText={isEditMode && helpText}
      customValidationRules={(value: string) => {
        if (value !== component.id && idExists(value, components, containers)) {
          return 'unique';
        }
      }}
      customValidationMessages={(errorCode: string) => {
        if (errorCode === 'unique') {
          return t('ux_editor.modal_properties_component_id_not_unique_error');
        }
        if (errorCode === 'pattern') {
          return t('ux_editor.modal_properties_component_id_not_valid');
        }
      }}
      renderField={({ fieldProps }) => (
        <div ref={wrapperRef}>
          {!isEditMode ? (
            <StudioButton
              variant='tertiary'
              size='medium'
              icon={<KeyVerticalIcon className={classes.KeyVerticalIcon} />}
              iconPlacement='left'
              fullWidth
              onClick={() => setIsEditMode(true)}
            >
              <span className={classes.componentId}>{`ID: ${component.id}`}</span>
              <PencilIcon className={classes.pencilIcon} />
            </StudioButton>
          ) : (
            <Textfield
              {...fieldProps}
              name={`component-id-input${component.id}`}
              onChange={(e) => {
                fieldProps.onChange(e.target.value, e);
              }}
              onBlur={(e) => {
                setIsEditMode(false);
              }}
            />
          )}
        </div>
      )}
    />
  );
};
