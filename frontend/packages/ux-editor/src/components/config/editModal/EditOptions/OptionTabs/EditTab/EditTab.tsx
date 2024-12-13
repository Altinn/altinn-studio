import React, { useState } from 'react';
import { StudioErrorMessage } from '@studio/components';
import { AddManualOptionsModal } from './AddManualOptionsModal';
import { OptionListSelector } from './OptionListSelector';
import { OptionListUploader } from './OptionListUploader';
import { OptionListEditor } from './/OptionListEditor';
import { useComponentErrorMessage } from '../../../../../../hooks';
import type { IGenericEditComponent } from '../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../types/FormComponent';
import classes from './EditTab.module.css';

type EditOptionChoiceProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function EditTab({
  component,
  handleComponentChange,
}: EditOptionChoiceProps): React.ReactElement {
  const initialComponentHasOptionList: boolean = !!component.optionsId || !!component.options;
  const [componentHasOptionList, setComponentHasOptionList] = useState<boolean>(
    initialComponentHasOptionList,
  );
  const errorMessage = useComponentErrorMessage(component);

  return (
    <>
      {componentHasOptionList ? (
        <SelectedOptionList
          setComponentHasOptionList={setComponentHasOptionList}
          component={component}
          handleComponentChange={handleComponentChange}
        />
      ) : (
        <div className={classes.container}>
          <AddManualOptionsModal
            setComponentHasOptionList={setComponentHasOptionList}
            component={component}
            handleComponentChange={handleComponentChange}
          />
          <OptionListSelector
            setComponentHasOptionList={setComponentHasOptionList}
            component={component}
            handleComponentChange={handleComponentChange}
          />
          <OptionListUploader
            setComponentHasOptionList={setComponentHasOptionList}
            component={component}
            handleComponentChange={handleComponentChange}
          />
        </div>
      )}
      {errorMessage && (
        <StudioErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </StudioErrorMessage>
      )}
    </>
  );
}

type SelectedOptionListProps = {
  setComponentHasOptionList: (value: boolean) => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

function SelectedOptionList({
  setComponentHasOptionList,
  component,
  handleComponentChange,
}: SelectedOptionListProps) {
  return (
    <OptionListEditor
      optionsId={component.optionsId}
      component={component}
      handleComponentChange={handleComponentChange}
      setComponentHasOptionList={setComponentHasOptionList}
    />
  );
}
