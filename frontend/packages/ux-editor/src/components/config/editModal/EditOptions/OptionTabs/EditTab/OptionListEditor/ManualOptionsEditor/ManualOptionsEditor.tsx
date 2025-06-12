import React from 'react';
import type { IGenericEditComponent } from '../../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../../types/FormComponent';
import { OptionListLabels } from '../OptionListLabels';
import { OptionListButtons } from '../OptionListButtons';
import { useTextResourcesForLanguage } from '../../hooks/useTextResourcesForLanguage';
import type { ITextResources } from 'app-shared/types/global';

export type ManualOptionsEditorProps = {
  handleDelete: () => void;
  onEditButtonClick: () => void;
  textResources: ITextResources;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component'>;

export function ManualOptionsEditor({
  component,
  handleDelete,
  onEditButtonClick,
  textResources,
}): React.ReactNode {
  const textResourcesForLanguage = useTextResourcesForLanguage(language, textResources);

  return (
    <>
      <OptionListLabels
        optionListId={component.optionsId}
        optionList={component.options}
        textResources={textResourcesForLanguage}
      />
      <OptionListButtons handleDelete={handleDelete} handleClick={onEditButtonClick} />
    </>
  );
}

const language: string = 'nb'; // Todo: Let the user choose the language: https://github.com/Altinn/altinn-studio/issues/14572

ManualOptionsEditor.displayName = 'ManualOptionsEditor';
