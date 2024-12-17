import React, { useRef } from 'react';
import { StudioButton, StudioErrorMessage, usePrevious } from '@studio/components';
import { OptionListSelector } from './OptionListSelector';
import { OptionListUploader } from './OptionListUploader';
import { OptionListEditor } from './/OptionListEditor';
import { useComponentErrorMessage } from '../../../../../../hooks';
import type { IGenericEditComponent } from '../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import { useTranslation } from 'react-i18next';
import { useUpdate } from 'app-shared/hooks/useUpdate';
import { handleOptionsChange } from './utils/utils';
import classes from './EditTab.module.css';

type EditTabProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function EditTab({ component, handleComponentChange }: EditTabProps): React.ReactElement {
  const componentHasOptionList: boolean = !!component.optionsId || !!component.options;
  const errorMessage = useComponentErrorMessage(component);
  const previousComponent = usePrevious(component);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useUpdate(() => {
    if (!previousComponent.options && !!component.options) dialogRef.current.showModal();
  }, [component, previousComponent]);

  return (
    <>
      {componentHasOptionList ? (
        <OptionListEditor
          ref={dialogRef}
          component={component}
          handleComponentChange={handleComponentChange}
        />
      ) : (
        <div className={classes.container}>
          <AddOptionList component={component} handleComponentChange={handleComponentChange} />
        </div>
      )}
      {errorMessage && <StudioErrorMessage size='small'>{errorMessage}</StudioErrorMessage>}
    </>
  );
}

type AddOptionListProps = EditTabProps;

function AddOptionList({ component, handleComponentChange }: AddOptionListProps) {
  const { t } = useTranslation();

  const handleInitialManualOptionsChange = () => {
    handleOptionsChange({ component, handleComponentChange, options: [] });
  };

  return (
    <div className={classes.container}>
      <StudioButton
        className={classes.createNewButton}
        variant='secondary'
        onClick={handleInitialManualOptionsChange}
      >
        {t('general.create_new')}
      </StudioButton>
      <OptionListSelector component={component} handleComponentChange={handleComponentChange} />
      <OptionListUploader component={component} handleComponentChange={handleComponentChange} />
    </div>
  );
}
