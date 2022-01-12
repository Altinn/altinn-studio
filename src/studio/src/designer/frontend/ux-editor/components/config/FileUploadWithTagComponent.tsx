import { Grid, Typography } from '@material-ui/core';
import * as React from 'react';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { renderSelectTextFromResources } from '../../utils/render';
import AltinnRadioGroup from 'app-shared/components/AltinnRadioGroup';
import AltinnRadio from 'app-shared/components/AltinnRadio';

type FileUploadWithTagComponentProps = {
  component: IFormFileUploaderWithTagComponent;
  stateComponent: any;
  handleComponentUpdate: (updatedComponent: FormComponentType) => void;
  language: any;
  textResources: any;
  handleTitleChange: (e: any) => void;
  handleDescriptionChange: (e: any) => void;
  handleOptionsIdChange: (e: any) => void;
  handleNumberOfAttachmentsChange: (e: any) => void;
  handleMaxFileSizeInMBChange: (e: any) => void;
  handleHasCustomFileEndingsChange: (e: any) => void;
  handleValidFileEndingsChange: (e: any) => void;
}

export const FileUploadWithTagComponent = ({
  component,
  stateComponent,
  language,
  textResources,
  handleComponentUpdate,
  handleTitleChange,
  handleDescriptionChange,
  handleOptionsIdChange,
  handleNumberOfAttachmentsChange,
  handleMaxFileSizeInMBChange,
  handleHasCustomFileEndingsChange,
  handleValidFileEndingsChange
}: FileUploadWithTagComponentProps) => {

  const handleTagTitleChange = (e: any): void => {
    const updatedComponent = { ...component };
    updatedComponent.textResourceBindings.tagTitle = e ? e.value : null;
    handleComponentUpdate(updatedComponent);
  }

  return (
    <Grid
      container={true}
    >
      <Grid item={true} xs={12}>
        {renderSelectTextFromResources('modal_properties_label_helper',
          handleTitleChange,
          textResources,
          language,
          stateComponent.textResourceBindings?.title,
          component.textResourceBindings?.title)}
        {renderSelectTextFromResources('modal_properties_description_helper',
          handleDescriptionChange,
          textResources,
          language,
          stateComponent.textResourceBindings?.description,
          component.textResourceBindings?.description)}
        {renderSelectTextFromResources('modal_properties_tag_helper',
          handleTagTitleChange,
          textResources,
          language,
          stateComponent.textResourceBindings?.tagTitle,
          component.textResourceBindings?.tagTitle)}
      </Grid>
      <Grid item={true} xs={12}>
        <AltinnInputField
          id='modal-properties-code-list-id'
          onChangeFunction={handleOptionsIdChange}
          inputValue={component.optionsId}
          inputDescription={getLanguageFromKey(
            'ux_editor.modal_properties_code_list_id', language,
          )}
          inputFieldStyling={{ width: '100%', marginBottom: '24px' }}
          inputDescriptionStyling={{ marginTop: '24px' }}
        />
      </Grid>
      <Typography>
        <a
          target='_blank'
          rel='noopener noreferrer'
          href='https://docs.altinn.studio/app/development/data/options/'
        >
          {getLanguageFromKey(
            'ux_editor.modal_properties_code_list_read_more', language,
          )}
        </a>
      </Typography>
      <Grid item={true} xs={12}>
        <AltinnRadioGroup
          row={true}
          value={component.hasCustomFileEndings ? 'true' : 'false'}
          onChange={handleHasCustomFileEndingsChange}
        >
          <AltinnRadio
            label={getLanguageFromKey('ux_editor.modal_properties_valid_file_endings_all', language)}
            value='false'
          />
          <AltinnRadio
            label={getLanguageFromKey(
              'ux_editor.modal_properties_valid_file_endings_custom', language,
            )}
            value='true'
          />
        </AltinnRadioGroup>
      </Grid>

      {component.hasCustomFileEndings &&
        <Grid item={true} xs={12}>
          <AltinnInputField
            id='modal-properties-valid-file-endings'
            onChangeFunction={handleValidFileEndingsChange}
            inputValue={component.validFileEndings}
            inputDescription={getLanguageFromKey(
              'ux_editor.modal_properties_valid_file_endings_helper', language,
            )}
            inputFieldStyling={{ width: '100%' }}
            inputDescriptionStyling={{ marginTop: '24px' }}
          />
        </Grid>
      }
      <Grid item={true} xs={12}>
        <AltinnInputField
          id='modal-properties-minimum-files'
          onChangeFunction={handleNumberOfAttachmentsChange('min')}
          inputValue={component.minNumberOfAttachments || 0}
          inputDescription={getLanguageFromKey('ux_editor.modal_properties_minimum_files', language)}
          inputFieldStyling={{ width: '60px' }}
          inputDescriptionStyling={{ marginTop: '24px' }}
          type='number'
        />
      </Grid>
      <Grid item={true} xs={12}>
        <AltinnInputField
          id='modal-properties-maximum-files'
          onChangeFunction={handleNumberOfAttachmentsChange('max')}
          inputValue={component.maxNumberOfAttachments || 1}
          inputDescription={getLanguageFromKey('ux_editor.modal_properties_maximum_files', language)}
          inputFieldStyling={{ width: '60px' }}
          inputDescriptionStyling={{ marginTop: '24px' }}
          type='number'
        />
      </Grid>
      <Grid item={true} xs={12}>
        <AltinnInputField
          id='modal-properties-file-size'
          onChangeFunction={handleMaxFileSizeInMBChange}
          inputValue={component.maxFileSizeInMB || 0}
          inputDescription={getLanguageFromKey(
            'ux_editor.modal_properties_maximum_file_size', language,
          )}
          inputFieldStyling={{ width: '60px' }}
          inputDescriptionStyling={{ marginTop: '24px' }}
          type='number'
        />
        <Typography
          style={{
            fontSize: '1.6rem',
            display: 'inline-block',
            marginTop: '23px',
            marginLeft: '6px',
          }}
        >
          {getLanguageFromKey(
            'ux_editor.modal_properties_maximum_file_size_helper', language,
          )}
        </Typography>
      </Grid>
    </Grid>
  );
};
