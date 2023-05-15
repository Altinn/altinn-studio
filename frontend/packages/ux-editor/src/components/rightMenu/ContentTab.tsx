import React, { useContext } from 'react';
import { TextResourceEdit } from '../TextResourceEdit';
import { EditFormComponent } from '../config/EditFormComponent';
import { EditFormContainer } from '../config/EditFormContainer';
import { getCurrentEditId } from '../../selectors/textResourceSelectors';
import { useSelector } from 'react-redux';
import { LayoutItemType } from '../../types/global';
import { FormContext } from '../../containers/FormContext';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { XMarkIcon, CheckmarkIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import classes from './ContentTab.module.css';

export const ContentTab = () => {
  const { t } = useTranslation();

  const { formId, form, handleDiscard, handleUpdate, handleContainerSave, handleComponentSave } = useContext(FormContext);
  const editId = useSelector(getCurrentEditId);

  if (editId) return (<TextResourceEdit/>);
  if (!formId || !form) return null;

  const isContainer = form.itemType === LayoutItemType.Container;

  return (
  <>
    {
      isContainer ? (
        <EditFormContainer editFormId={formId} container={form} handleContainerUpdate={handleUpdate} />
      ) : (
        <EditFormComponent component={form} handleComponentUpdate={handleUpdate} />
      )
    }
    <div className={classes.buttonsContainer}>
      <Button
        color={ButtonColor.Secondary}
        icon={<CheckmarkIcon />}
        onClick={() => isContainer ? handleContainerSave(formId, form) : handleComponentSave(formId, form)}
        tabIndex={0}
        variant={ButtonVariant.Filled}
      >{t('general.save')}</Button>
      <Button
        color={ButtonColor.Secondary}
        icon={<XMarkIcon />}
        onClick={handleDiscard}
        tabIndex={0}
        variant={ButtonVariant.Outline}
      >{t('general.cancel')}</Button>
    </div>
  </>
)};
