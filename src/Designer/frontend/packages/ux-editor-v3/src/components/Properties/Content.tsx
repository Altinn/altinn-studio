import React from 'react';
import { TextResourceEdit } from '../TextResourceEdit';
import { EditFormComponent } from '../config/EditFormComponent';
import { EditFormContainer } from '../config/EditFormContainer';
import { getCurrentEditId } from '../../selectors/textResourceSelectors';
import { useSelector } from 'react-redux';
import { useFormItemContext } from '../../containers/FormItemContext';
import { useTranslation } from 'react-i18next';
import { isContainer } from '../../utils/formItemUtils';

export const Content = () => {
  const { formItemId: formId, formItem: form, handleUpdate, debounceSave } = useFormItemContext();
  const editId = useSelector(getCurrentEditId);
  const { t } = useTranslation();

  if (editId) return <TextResourceEdit />;
  if (!formId || !form) return t('right_menu.content_empty');

  return isContainer(form) ? (
    <EditFormContainer
      editFormId={formId}
      container={form}
      handleContainerUpdate={async (updatedContainer) => {
        handleUpdate(updatedContainer);
        debounceSave(formId, updatedContainer);
      }}
    />
  ) : (
    <EditFormComponent
      editFormId={formId}
      component={form}
      handleComponentUpdate={async (updatedComponent) => {
        handleUpdate(updatedComponent);
        debounceSave(formId, updatedComponent);
      }}
    />
  );
};
