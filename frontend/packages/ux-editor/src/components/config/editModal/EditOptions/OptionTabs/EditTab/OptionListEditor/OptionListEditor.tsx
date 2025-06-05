import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner, StudioErrorMessage, StudioDeleteButton } from '@studio/components-legacy';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { useOptionListQuery, useTextResourcesQuery } from 'app-shared/hooks/queries';
import { LibraryOptionsEditor } from './LibraryOptionsEditor';
import { handleOptionsChange, resetComponentOptions } from '../../utils/optionsUtils';
import classes from './OptionListEditor.module.css';
import { OptionListLabels } from '@altinn/ux-editor/components/config/editModal/EditOptions/OptionTabs/EditTab/OptionListEditor/OptionListLabels';
import { OptionListButtons } from '@altinn/ux-editor/components/config/editModal/EditOptions/OptionTabs/EditTab/OptionListEditor/OptionListButtons';
import { useTextResourcesForLanguage } from '@altinn/ux-editor/components/config/editModal/EditOptions/OptionTabs/EditTab/OptionListEditor/hooks';

export type OptionListEditorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
> & {
  onEditButtonClick: () => void;
};

export const OptionListEditor = forwardRef<HTMLDialogElement, OptionListEditorProps>(
  (
    { component, handleComponentChange, onEditButtonClick }: OptionListEditorProps,
    ref,
  ): React.ReactNode => {
    const { org, app } = useStudioEnvironmentParams();
    const { data: textResources } = useTextResourcesQuery(org, app);
    const textResourcesForLanguage = useTextResourcesForLanguage(language, textResources);

    const handleDelete = () => {
      const updatedComponent = resetComponentOptions(component);
      handleOptionsChange(updatedComponent, handleComponentChange);
    };

    if (component.options !== undefined) {
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

    return <OptionListResolver optionsId={component.optionsId} handleDelete={handleDelete} />;
  },
);

const language: string = 'nb'; // Todo: Let the user choose the language: https://github.com/Altinn/altinn-studio/issues/14572

type OptionsListResolverProps = {
  handleDelete: () => void;
  optionsId: string;
};

function OptionListResolver({
  handleDelete,
  optionsId,
}: OptionsListResolverProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { status } = useOptionListQuery(org, app, optionsId);

  switch (status) {
    case 'pending':
      return (
        <StudioSpinner spinnerTitle={t('ux_editor.modal_properties_code_list_spinner_title')} />
      );
    case 'error':
      return (
        <>
          <StudioErrorMessage>
            {t('ux_editor.modal_properties_fetch_option_list_error_message')}
          </StudioErrorMessage>
          <StudioDeleteButton
            className={classes.deleteButton}
            onDelete={handleDelete}
            title={t('ux_editor.options.option_remove_text')}
          >
            {t('general.delete')}
          </StudioDeleteButton>
        </>
      );
    case 'success': {
      return <LibraryOptionsEditor handleDelete={handleDelete} optionListId={optionsId} />;
    }
  }
}

OptionListEditor.displayName = 'OptionListEditor';
