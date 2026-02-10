import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioCodeFragment,
  StudioDeleteButton,
  StudioParagraph,
  StudioSpinner,
  StudioValidationMessage,
} from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { useOptionListQuery } from 'app-shared/hooks/queries';
import { LibraryOptionsEditor } from './LibraryOptionsEditor';
import { ManualOptionsPanel } from './ManualOptionsPanel';
import { handleOptionsChange, resetComponentOptions } from '../../utils/optionsUtils';
import classes from './OptionListEditor.module.css';
import type { ITextResources } from 'app-shared/types/global';
import { retrieveOptionsType } from '../../utils/retrieveOptionsType';
import { OptionsType } from '../../enums/OptionsType';
import type { CodeListIdContextData } from '../../types/CodeListIdContextData';
import { extractValuesFromPublishedCodeListReferenceString } from '../../utils/published-code-list-reference-utils';
import { Guard } from '@studio/guard';

export type OptionListEditorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
> & {
  codeListIdContextData: CodeListIdContextData;
  textResources: ITextResources;
  onEditButtonClick: () => void;
};

export function OptionListEditor({
  codeListIdContextData,
  component,
  handleComponentChange,
  onEditButtonClick,
  textResources,
}: OptionListEditorProps): React.ReactElement {
  const handleDeleteButtonClick = () => {
    const updatedComponent = resetComponentOptions(component);
    handleOptionsChange(updatedComponent, handleComponentChange);
  };

  const type = retrieveOptionsType(component, codeListIdContextData);
  Guard.againstNull(type);
  Guard.againstInvalidValue<OptionsType, OptionsType.CustomId>(type, OptionsType.CustomId);

  switch (type) {
    case OptionsType.Internal:
      return (
        <ManualOptionsPanel
          component={component}
          onDeleteButtonClick={handleDeleteButtonClick}
          onEditButtonClick={onEditButtonClick}
          textResources={textResources}
        />
      );
    case OptionsType.FromAppLibrary:
      return (
        <OptionListResolver
          optionsId={component.optionsId}
          onDeleteButtonClick={handleDeleteButtonClick}
          textResources={textResources}
        />
      );
    case OptionsType.Published:
      return <PublishedCodeListEditor referenceString={component.optionsId} />;
  }
}

type OptionsListResolverProps = {
  onDeleteButtonClick: () => void;
  optionsId: string;
  textResources: ITextResources;
};

function OptionListResolver({
  onDeleteButtonClick,
  optionsId,
  textResources,
}: OptionsListResolverProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { status } = useOptionListQuery(org, app, optionsId);

  switch (status) {
    case 'pending':
      return (
        <StudioSpinner
          aria-hidden
          spinnerTitle={t('ux_editor.modal_properties_code_list_spinner_title')}
        />
      );
    case 'error':
      return (
        <>
          <StudioValidationMessage>
            {t('ux_editor.modal_properties_fetch_option_list_error_message')}
          </StudioValidationMessage>
          <StudioDeleteButton
            className={classes.deleteButton}
            onDelete={onDeleteButtonClick}
            title={t('ux_editor.options.option_remove_text')}
          >
            {t('general.delete')}
          </StudioDeleteButton>
        </>
      );
    case 'success': {
      return (
        <LibraryOptionsEditor
          onDeleteButtonClick={onDeleteButtonClick}
          optionListId={optionsId}
          textResources={textResources}
        />
      );
    }
  }
}

type PublishedCodeListEditorProps = {
  readonly referenceString: string;
};

function PublishedCodeListEditor({
  referenceString,
}: PublishedCodeListEditorProps): React.ReactElement {
  const referenceValues = extractValuesFromPublishedCodeListReferenceString(referenceString);
  Guard.againstNull(referenceValues);
  const { codeListName, version } = referenceValues;

  return (
    <StudioParagraph>
      <Trans
        components={{ code: <StudioCodeFragment /> }}
        i18nKey='ux_editor.options.published_code_list_in_use'
        values={{ codeListName, version }}
      />
    </StudioParagraph>
  );
}

OptionListEditor.displayName = 'OptionListEditor';
