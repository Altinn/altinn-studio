import React, { useEffect, useState, useRef } from 'react';
import { TextField } from '@digdir/design-system-react';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import { idExists, validComponentId } from '../../../utils/formLayoutUtils';
import { useTranslation } from 'react-i18next';
import { useFormLayoutsSelector } from '../../../hooks/useFormLayoutsSelector';
import { selectedLayoutSelector } from '../../../selectors/formLayoutSelectors';
import type { FormComponent } from '../../../types/FormComponent';

export interface IEditComponentId {
  handleComponentUpdate: (component: FormComponent) => void;
  component: FormComponent;
}
export const EditComponentId = ({ component, handleComponentUpdate }: IEditComponentId) => {
  const [error, setError] = useState<string | null>(null);
  const [tmpId, setTmpId] = useState<string>(component?.id || '');
  const { components, containers } = useFormLayoutsSelector(selectedLayoutSelector);
  const { t } = useTranslation();
  const errorMessageRef = useRef<HTMLDivElement>();

  useEffect(() => {
    setTmpId(component?.id);
  }, [component]);

  const handleClosePopup = () => setError(null);

  const handleNewId = () => {
    if (idExists(tmpId, components, containers) && tmpId !== component?.id) {
      setError(t('ux_editor.modal_properties_component_id_not_unique_error'));
    } else if (!tmpId || !validComponentId.test(tmpId)) {
      setError(t('ux_editor.modal_properties_component_id_not_valid'));
    } else {
      setError(null);
      handleComponentUpdate({
        ...component,
        id: tmpId,
      });
    }
  };

  const handleIdChange = (event: any) => {
    setTmpId(event.target.value);
  };

  return (
    <div>
      <TextField
        id={`component-id-input${component.id}`}
        label={t('ux_editor.modal_properties_component_change_id')}
        onBlur={handleNewId}
        onChange={handleIdChange}
        value={tmpId ?? ''}
      />
      <div ref={errorMessageRef} />
      <ErrorPopover
        anchorEl={error ? errorMessageRef.current : null}
        onClose={handleClosePopup}
        errorMessage={error}
      />
    </div>
  );
};
