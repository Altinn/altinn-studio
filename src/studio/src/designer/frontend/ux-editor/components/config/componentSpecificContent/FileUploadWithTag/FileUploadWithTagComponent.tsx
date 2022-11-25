import React from 'react';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { SelectTextFromRecources } from '../../../../utils/render';
import RadioGroup from 'app-shared/components/AltinnRadioGroup';
import AltinnRadio from 'app-shared/components/AltinnRadio';
import type { FormComponentType, IFormFileUploaderWithTagComponent } from '../../../../types/global';
import { TextField } from '@altinn/altinn-design-system';

type FileUploadWithTagComponentProps = {
  component: IFormFileUploaderWithTagComponent;
  stateComponent: any;
  handleComponentUpdate: (updatedComponent: FormComponentType) => void;
  language: any;
  textResources: any;
  handleNumberOfAttachmentsChange: (type: string) => (e: any) => void;
  handleMaxFileSizeInMBChange: (e: any) => void;
  handleHasCustomFileEndingsChange: (e: any) => void;
  handleValidFileEndingsChange: (e: any) => void;
};

export const FileUploadWithTagComponent = ({
  component,
  stateComponent,
  language,
  textResources,
  handleComponentUpdate,
  handleNumberOfAttachmentsChange,
  handleMaxFileSizeInMBChange,
  handleHasCustomFileEndingsChange,
  handleValidFileEndingsChange,
}: FileUploadWithTagComponentProps) => {
  const handleTagTitleChange = (e: any): void => {
    const updatedComponent = { ...component };
    updatedComponent.textResourceBindings.tagTitle = e ? e.value : null;
    handleComponentUpdate(updatedComponent);
  };

  const handleOptionsIdChange = (e: any) => {
    handleComponentUpdate({
      ...component,
      optionsId: e.target.value,
    });
  };

  const t = (key: string) => getLanguageFromKey(key, language);

  return (
    <>
      <SelectTextFromRecources
        description={component.textResourceBindings?.tagTitle}
        labelText={'modal_properties_tag_helper'}
        language={language}
        onChangeFunction={handleTagTitleChange}
        placeholder={stateComponent.textResourceBindings?.tagTitle}
        textResources={textResources}
      />
      <div>
        <TextField
          id='modal-properties-code-list-id'
          label={t('ux_editor.modal_properties_code_list_id')}
          onChange={handleOptionsIdChange}
          value={component.optionsId}
        />
      </div>
      <p>
        <a
          target='_blank'
          rel='noopener noreferrer'
          href='https://docs.altinn.studio/app/development/data/options/'
        >
          {t('ux_editor.modal_properties_code_list_read_more')}
        </a>
      </p>
      <div>
        <RadioGroup
          row={true}
          value={component.hasCustomFileEndings ? 'true' : 'false'}
          onChange={handleHasCustomFileEndingsChange}
        >
          <AltinnRadio
            label={t('ux_editor.modal_properties_valid_file_endings_all')}
            value='false'
          />
          <AltinnRadio
            label={t('ux_editor.modal_properties_valid_file_endings_custom')}
            value='true'
          />
        </RadioGroup>
      </div>
      {component.hasCustomFileEndings && (
        <div>
          <TextField
            id='modal-properties-valid-file-endings'
            onChange={handleValidFileEndingsChange}
            value={component.validFileEndings}
            label={t('ux_editor.modal_properties_valid_file_endings_helper')}
          />
        </div>
      )}
      <div>
        <TextField
          formatting={{ number: {} }}
          id='modal-properties-minimum-files'
          label={t('ux_editor.modal_properties_minimum_files')}
          onChange={handleNumberOfAttachmentsChange('min')}
          value={(component.minNumberOfAttachments || 0).toString()}
        />
      </div>
      <div>
        <TextField
          formatting={{ number: {} }}
          id='modal-properties-maximum-files'
          label={t('ux_editor.modal_properties_maximum_files')}
          onChange={handleNumberOfAttachmentsChange('max')}
          value={(component.maxNumberOfAttachments || 1).toString()}
        />
      </div>
      <div>
        <TextField
          formatting={{ number: {} }}
          id='modal-properties-file-size'
          label={`${t('ux_editor.modal_properties_maximum_file_size')} (${t(
            'ux_editor.modal_properties_maximum_file_size_helper',
          )})`}
          onChange={handleMaxFileSizeInMBChange}
          value={(component.maxFileSizeInMB || 0).toString()}
        />
      </div>
    </>
  );
};
