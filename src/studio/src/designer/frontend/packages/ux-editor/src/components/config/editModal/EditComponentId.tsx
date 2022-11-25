import React, { useEffect, useState, useRef } from 'react';
import { TextField } from '@altinn/altinn-design-system';
import { getLanguageFromKey } from 'app-shared/utils/language';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import type { FormComponentType, IAppState } from '../../../types/global';
import { useSelector } from 'react-redux';
import { idExists, validComponentId } from '../../../utils/formLayout';

export interface IEditComponentId {
  handleComponentUpdate: (component: FormComponentType) => void;
  component: FormComponentType;
}
export const EditComponentId = ({ component, handleComponentUpdate }: IEditComponentId) => {
  const [error, setError] = useState<string | null>(null);
  const [tmpId, setTmpId] = useState<string>(component?.id || '');
  const components = useSelector(
    (state: IAppState) =>
      state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.components
  );
  const containers = useSelector(
    (state: IAppState) =>
      state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.containers
  );
  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  const t = (key: string) => getLanguageFromKey(key, language);
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
