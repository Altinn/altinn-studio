import React, { useContext } from 'react';
import { TextResourceEdit } from '../TextResourceEdit';
import { EditFormComponent } from '../config/EditFormComponent';
import { EditFormContainer } from '../config/EditFormContainer';
import { getCurrentEditId } from '../../selectors/textResourceSelectors';
import { useSelector } from 'react-redux';
import { LayoutItemType } from '../../types/global';
import { FormContext } from '../../containers/FormContext';

export const ContentTab = () => {
  const { formId, form, handleUpdate, handleContainerSave, handleComponentSave } = useContext(FormContext);
  const editId = useSelector(getCurrentEditId);

  if (editId) return (<TextResourceEdit/>);
  if (!formId || !form) return null;

  const isContainer = form.itemType === LayoutItemType.Container;

  return (
  <>
    {
      isContainer ? (
        <EditFormContainer editFormId={formId} container={form} handleContainerUpdate={async (updatedContainer) => {
          handleUpdate(updatedContainer);
          await handleContainerSave(formId, updatedContainer);
        }} />
      ) : (
        <EditFormComponent editFormId={formId} component={form} handleComponentUpdate={async (updatedComponent) => {
          handleUpdate(updatedComponent);
          await handleComponentSave(formId, updatedComponent);
        }} />
      )
    }
  </>
)};
