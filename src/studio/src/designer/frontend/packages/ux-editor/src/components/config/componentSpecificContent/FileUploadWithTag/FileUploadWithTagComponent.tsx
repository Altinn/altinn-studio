import React from 'react';
import { getLanguageFromKey } from 'app-shared/utils/language';
import type { FormComponentType, IFormFileUploaderWithTagComponent } from '../../../../types/global';
import { RadioGroup, RadioGroupVariant, TextField } from '@altinn/altinn-design-system';
import { TextResource } from '../../../TextResource';

type FileUploadWithTagComponentProps = {
  component: IFormFileUploaderWithTagComponent;
  stateComponent: any;
  handleComponentUpdate: (updatedComponent: FormComponentType) => void;
  language: any;
  handleNumberOfAttachmentsChange: (type: string) => (e: any) => void;
  handleMaxFileSizeInMBChange: (e: any) => void;
  handleHasCustomFileEndingsChange: (value: string) => void;
  handleValidFileEndingsChange: (e: any) => void;
};

export const FileUploadWithTagComponent = ({
  component,
  language,
  handleComponentUpdate,
  handleNumberOfAttachmentsChange,
  handleMaxFileSizeInMBChange,
  handleHasCustomFileEndingsChange,
  handleValidFileEndingsChange,
}: FileUploadWithTagComponentProps) => {
  const handleTagTitleChange = (id: string): void => {
    const updatedComponent = { ...component };
    updatedComponent.textResourceBindings.tagTitle = id;
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
      <TextResource
        handleIdChange={handleTagTitleChange}
        label={t('ux_editor.modal_properties_tag')}
        placeholder={t('ux_editor.modal_properties_tag_add')}
        textResourceId={component.textResourceBindings?.tagTitle}
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
      <RadioGroup
        items={[
          {
            label: t('ux_editor.modal_properties_valid_file_endings_all'),
            value: 'false',
          },
          {
            label: t('ux_editor.modal_properties_valid_file_endings_custom'),
            value: 'true',
          }
        ]}
        name={`${component.id}-valid-file-endings`}
        onChange={handleHasCustomFileEndingsChange}
        value={component.hasCustomFileEndings ? 'true' : 'false'}
        variant={RadioGroupVariant.Horizontal}
      />
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
