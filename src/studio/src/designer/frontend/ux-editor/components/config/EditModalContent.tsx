import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Grid, Typography } from '@mui/material';
import AltinnCheckBox from 'app-shared/components/AltinnCheckBox';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import AltinnRadio from 'app-shared/components/AltinnRadio';
import AltinnRadioGroup from 'app-shared/components/AltinnRadioGroup';
import { getLanguageFromKey } from 'app-shared/utils/language';
import Select from 'react-select';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import { renderSelectDataModelBinding, renderSelectTextFromResources } from '../../utils/render';
import { AddressKeys, getTextResourceByAddressKey } from '../../utils/component';
import { idExists, validComponentId } from '../../utils/formLayout';
import { SelectionEdit } from './SelectionEditComponent';
import { ImageComponent } from './ImageComponent';
import EditBoilerplate from './EditBoilerplate';
import HeaderSizeSelectComponent from './HeaderSizeSelect';
import { ComponentTypes } from '../index';
import { FileUploadWithTagComponent } from './FileUploadWithTagComponent';
import {
  FormComponentType,
  IAppState,
  IDataModelFieldElement,
  IFormAddressComponent,
  IFormCheckboxComponent,
  IFormComponent,
  IFormDropdownComponent,
  IFormFileUploaderComponent,
  IFormFileUploaderWithTagComponent,
  IFormHeaderComponent,
  IFormImageComponent,
  IFormRadioButtonComponent,
} from '../../types/global';
import { useSelector } from 'react-redux';
import classes from './EditModalContent.module.css';

export interface IEditModalContentProps {
  cancelEdit?: () => void;
  component: FormComponentType;
  handleComponentUpdate?: (updatedComponent: FormComponentType) => void;
  saveEdit?: (updatedComponent: FormComponentType) => void;
}

export const EditModalContent = ({ component, handleComponentUpdate }: IEditModalContentProps) => {
  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  const t = (key: string) => getLanguageFromKey(key, language);
  const textResources = useSelector((state: IAppState) => state.appData.textResources.resources);
  const dataModel = useSelector((state: IAppState) => state.appData.dataModel.model);
  const components = useSelector(
    (state: IAppState) => state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.components,
  );
  const containers = useSelector(
    (state: IAppState) => state.formDesigner.layout.layouts[state.formDesigner.layout.selectedLayout]?.containers,
  );
  const [error, setError] = useState<string | null>(null);
  const [tmpId, setTmpId] = useState<string>('');
  const errorMessageRef = useRef<HTMLDivElement>();
  useEffect(() => {
    setTmpId(component?.id);
  }, [component]);

  const handleTitleChange = (e: any): void =>
    handleComponentUpdate({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        title: e ? e.value : null,
      },
    });

  const handleIdChange = (event: any) => setTmpId(event.target.value);

  const handleAddOption = () => {
    const options = component.options ? [...component.options] : [];
    options.push({
      label: '',
      value: '',
    });
    handleComponentUpdate({ ...component, options });
  };
  const handleRemoveOption = (index: number | string) => {
    const options = component.options ? [...component.options] : [];
    options.splice(index as number, 1);
    handleComponentUpdate({ ...component, options });
  };

  const handleUpdateOptionLabel = (index: number, optionLabel: any) => {
    const updatedComponent: IFormComponent = { ...component };
    updatedComponent.options[index].label = optionLabel?.value;
    handleComponentUpdate(updatedComponent);
  };

  const handleUpdateOptionValue = (index: number, event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    event.persist();
    const updatedComponent: IFormComponent = { ...component };
    updatedComponent.options[index].value = event.target?.value;
    handleComponentUpdate(updatedComponent);
  };

  const handleUpdateHeaderSize = (event: any) =>
    handleComponentUpdate({ ...component, size: event.value } as IFormHeaderComponent);

  const handleDescriptionChange = (selectedText: any): void => {
    const updatedComponent = { ...component };
    updatedComponent.textResourceBindings.description = selectedText ? selectedText.value : null;
    handleComponentUpdate(updatedComponent);
  };

  const handlePreselectedOptionChange = (event: any): void =>
    handleComponentUpdate({
      ...(component as IFormCheckboxComponent | IFormRadioButtonComponent),
      preselectedOptionIndex: Number(event.target.value),
    });

  const getMinOccursFromDataModel = (dataBindingName: string): number => {
    const parentComponent = dataBindingName.replace('.value', '').replace(/\./, '/');
    return dataModel.find((e: IDataModelFieldElement) => e.xPath === `/${parentComponent}`)?.minOccurs;
  };

  const getXsdDataTypeFromDataModel = (dataBindingName: string): string =>
    dataModel.find((e: IDataModelFieldElement) => e.dataBindingName === dataBindingName)?.xsdValueType;

  const handleValidFileEndingsChange = (event: any) =>
    handleComponentUpdate({ ...component, validFileEndings: event.target.value } as
      | IFormFileUploaderComponent
      | IFormFileUploaderWithTagComponent);

  const handleOptionsIdChange = (event: any) =>
    handleComponentUpdate({ ...component, optionsId: event.target.value } as
      | IFormDropdownComponent
      | IFormCheckboxComponent
      | IFormRadioButtonComponent);

  const handleMaxFileSizeInMBChange = (event: any) => {
    const componentCopy = { ...component } as IFormFileUploaderComponent | IFormFileUploaderWithTagComponent;
    const value = parseInt(event.target.value, 10);
    componentCopy.maxFileSizeInMB = value >= 0 ? value : 0;
    handleComponentUpdate(componentCopy);
  };

  const handleNumberOfAttachmentsChange = (type: string) => (event: any) => {
    const componentCopy = { ...component } as IFormFileUploaderComponent | IFormFileUploaderWithTagComponent;
    const value = parseInt(event.target.value, 10);
    if (type === 'max') {
      componentCopy.maxNumberOfAttachments = value >= 1 ? value : 1;
    } else {
      componentCopy.minNumberOfAttachments = value >= 0 ? value : 0;
      componentCopy.required = value > 0;
    }
    handleComponentUpdate(componentCopy);
  };

  const handleDisplayModeChange = (event: any) =>
    handleComponentUpdate({
      ...component,
      displayMode: event.target.value,
    });

  const handleButtonTypeChange = (selected: any) => {
    const componentCopy = { ...component };
    if (!componentCopy.textResourceBindings) {
      componentCopy.textResourceBindings = {};
    }
    if (selected.value === 'NavigationButtons') {
      componentCopy.type = 'NavigationButtons';
      componentCopy.textResourceBindings.title = undefined;
      (componentCopy as any).textResourceId = undefined;
      componentCopy.customType = undefined;
      (componentCopy as any).showBackButton = true;
      componentCopy.textResourceBindings.next = 'next';
      componentCopy.textResourceBindings.back = 'back';
    } else if (selected.value === 'Button') {
      componentCopy.type = 'Button';
      componentCopy.textResourceBindings.next = undefined;
      componentCopy.textResourceBindings.back = undefined;
      (componentCopy as any).showPrev = undefined;
      (componentCopy as any).showBackButton = undefined;
      componentCopy.textResourceBindings.title = t('ux_editor.modal_properties_button_type_submit');
    }
    handleComponentUpdate(componentCopy);
  };

  const handleHasCustomFileEndingsChange = (event: any) => {
    const componentCopy = { ...component } as IFormFileUploaderComponent | IFormFileUploaderWithTagComponent;
    componentCopy.hasCustomFileEndings = event.target.value === 'true';
    if (!componentCopy.hasCustomFileEndings) {
      componentCopy.validFileEndings = undefined;
    }
    handleComponentUpdate(componentCopy);
  };

  const handleReadOnlyChange = (event: object, checked: boolean) =>
    handleComponentUpdate({
      ...component,
      readOnly: checked,
    });

  const handleRequiredChange = (event: any, checked: boolean) =>
    handleComponentUpdate({
      ...component,
      required: checked,
    });

  const handleDataModelChange = (selectedDataModelElement: string, key = 'simpleBinding') => {
    let { dataModelBindings: dataModelBinding } = component as IFormAddressComponent;
    if (!dataModelBinding) {
      dataModelBinding = {};
    }
    dataModelBinding[key] = selectedDataModelElement;
    const modifiedProperties: any = {
      dataModelBindings: dataModelBinding,
      required: getMinOccursFromDataModel(selectedDataModelElement) !== 0,
    };
    if (component.type === 'Datepicker') {
      modifiedProperties.timeStamp = getXsdDataTypeFromDataModel(selectedDataModelElement) === 'DateTime';
    }

    handleComponentUpdate({
      ...component,
      ...modifiedProperties,
    });
  };

  const handleToggleAddressSimple = (event: object, checked: boolean) =>
    handleComponentUpdate({
      ...component,
      simplified: checked,
    });

  const handleClosePopup = () => setError(null);

  const handleNewId = () => {
    if (idExists(tmpId, components, containers) && tmpId !== component?.id) {
      setError(t('ux_editor.modal_properties_component_id_not_unique_error'));
    } else if (!tmpId || !validComponentId.test(tmpId)) {
      setError(t('ux_editor.modal_properties_component_id_not_valid'));
    } else {
      setError(null);
      handleComponentUpdate({
        ...component,
        id: tmpId,
      });
    }
  };
  const renderChangeId = (): JSX.Element => {
    return (
      <Grid
        item={true}
        xs={12}
      >
        <AltinnInputField
          id='component-id'
          textFieldId={`component-id-input${component.id}`}
          onChangeFunction={handleIdChange}
          onBlurFunction={handleNewId}
          inputValue={tmpId}
          inputDescription={t('ux_editor.modal_properties_component_change_id')}
          inputFieldStyling={{ width: '100%' }}
          inputDescriptionStyling={{ marginTop: '24px' }}
        />
        <div ref={errorMessageRef} />
        <ErrorPopover
          anchorEl={error ? errorMessageRef.current : null}
          onClose={handleClosePopup}
          errorMessage={error}
        />
      </Grid>
    );
  };
  switch (component.type) {
    case ComponentTypes.Header: {
      return (
        <HeaderSizeSelectComponent
          renderChangeId={renderChangeId}
          component={component}
          language={language}
          textResources={textResources}
          handleTitleChange={handleTitleChange}
          handleUpdateHeaderSize={handleUpdateHeaderSize}
        />
      );
    }
    case ComponentTypes.Datepicker:
    case ComponentTypes.TextArea:
    case ComponentTypes.Input: {
      return (
        <>
          {renderChangeId()}
          <EditBoilerplate
            component={component}
            textResources={textResources}
            handleDataModelChange={handleDataModelChange}
            handleTitleChange={handleTitleChange}
            handleDescriptionChange={handleDescriptionChange}
            language={language}
          />
          <Grid
            item={true}
            xs={12}
            className={classes.gridItem}
          >
            <AltinnCheckBox
              checked={component.readOnly}
              onChangeFunction={handleReadOnlyChange}
            />
            {language['ux_editor.modal_configure_read_only']}
          </Grid>
          <Grid
            item={true}
            xs={12}
          >
            <AltinnCheckBox
              checked={component.required}
              onChangeFunction={handleRequiredChange}
            />
            {language['ux_editor.modal_configure_required']}
          </Grid>
        </>
      );
    }
    case ComponentTypes.AttachmentList: {
      return (
        <Grid>
          {renderChangeId()}
          {renderSelectTextFromResources(
            'modal_properties_label_helper',
            handleTitleChange,
            textResources,
            language,
            component.textResourceBindings?.title,
            component.textResourceBindings?.title,
          )}
        </Grid>
      );
    }
    case ComponentTypes.Paragraph: {
      return (
        <Grid>
          {renderChangeId()}
          {renderSelectTextFromResources(
            'modal_properties_paragraph_helper',
            handleTitleChange,
            textResources,
            language,
            component.textResourceBindings?.title,
            component.textResourceBindings?.title,
          )}
        </Grid>
      );
    }
    case ComponentTypes.Checkboxes:
    case ComponentTypes.RadioButtons: {
      return (
        <>
          {renderChangeId()}
          <SelectionEdit
            type={component.type as 'Checkboxes' | 'RadioButtons'}
            component={component}
            key={component.id}
            handleAddOption={handleAddOption}
            handleOptionsIdChange={handleOptionsIdChange}
            handleDescriptionChange={handleDescriptionChange}
            handlePreselectedOptionChange={handlePreselectedOptionChange}
            handleRemoveOption={handleRemoveOption}
            handleTitleChange={handleTitleChange}
            handleUpdateOptionLabel={handleUpdateOptionLabel}
            handleUpdateOptionValue={handleUpdateOptionValue}
            handleDataModelChange={handleDataModelChange}
            handleRequiredChange={handleRequiredChange}
            handleReadOnlyChange={handleReadOnlyChange}
          />
        </>
      );
    }
    case ComponentTypes.Dropdown: {
      return (
        <Grid container={true}>
          {renderChangeId()}
          <EditBoilerplate
            component={component}
            textResources={textResources}
            handleDataModelChange={handleDataModelChange}
            handleTitleChange={handleTitleChange}
            handleDescriptionChange={handleDescriptionChange}
            language={language}
          />
          <Grid
            item={true}
            xs={12}
            className={classes.gridItem}
          >
            <AltinnCheckBox
              checked={component.readOnly}
              onChangeFunction={handleReadOnlyChange}
            />
            {language['ux_editor.modal_configure_read_only']}
          </Grid>
          <Grid
            item={true}
            xs={12}
          >
            <AltinnCheckBox
              checked={component.required}
              onChangeFunction={handleRequiredChange}
            />
            {language['ux_editor.modal_configure_required']}
          </Grid>
          <Grid
            item={true}
            xs={12}
          >
            <AltinnInputField
              id='modal-properties-code-list-id'
              onChangeFunction={handleOptionsIdChange}
              inputValue={'optionsId' in component ? component.optionsId : ''}
              inputDescription={t('ux_editor.modal_properties_code_list_id')}
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
              {t('ux_editor.modal_properties_code_list_read_more')}
            </a>
          </Typography>
        </Grid>
      );
    }
    case ComponentTypes.NavigationButtons:
    case ComponentTypes.Button: {
      const types = [
        {
          value: 'Button',
          label: t('ux_editor.modal_properties_button_type_submit'),
        },
        {
          value: 'NavigationButtons',
          label: t('ux_editor.modal_properties_button_type_navigation'),
        },
      ];
      return (
        <>
          {renderChangeId()}
          <Grid
            item={true}
            xs={12}
          >
            <Typography className={classes.inputHelper}>
              {t('ux_editor.modal_properties_button_type_helper')}
            </Typography>
            <Select
              options={types}
              value={types.find((element) => element.value === component.type)}
              onChange={handleButtonTypeChange}
              placeholder={t('ux_editor.modal_properties_button_type_submit')}
            />
            {component.type === 'Button' &&
              renderSelectTextFromResources(
                'modal_properties_button_helper',
                handleTitleChange,
                textResources,
                language,
                component.textResourceBindings?.title,
                t('ux_editor.modal_properties_button_type_submit'),
              )}
          </Grid>
        </>
      );
    }

    case ComponentTypes.AddressComponent: {
      return (
        <Grid
          container={true}
          spacing={0}
          direction='column'
        >
          {renderChangeId()}
          <Grid
            item={true}
            xs={12}
            style={{ marginTop: '2.4rem' }}
          >
            <AltinnCheckBox
              checked={(component as IFormAddressComponent).simplified}
              onChangeFunction={handleToggleAddressSimple}
            />
            {t('ux_editor.modal_configure_address_component_simplified')}
          </Grid>
          {renderSelectTextFromResources(
            'modal_properties_label_helper',
            handleTitleChange,
            textResources,
            language,
            component.textResourceBindings?.title,
            component.textResourceBindings?.title,
          )}
          {Object.keys(AddressKeys).map((value: AddressKeys, index) => {
            const simple: boolean = (component as IFormAddressComponent).simplified;
            if (simple && (value === AddressKeys.careOf || value === AddressKeys.houseNumber)) {
              return null;
            }
            return renderSelectDataModelBinding(
              component.dataModelBindings,
              handleDataModelChange,
              language,
              getTextResourceByAddressKey(value, language),
              value,
              value,
              index,
            );
          })}
        </Grid>
      );
    }

    case ComponentTypes.FileUpload: {
      const fileUploaderComponent = component as IFormFileUploaderComponent;
      return (
        <Grid>
          {renderChangeId()}
          <Grid
            item={true}
            xs={12}
          >
            <AltinnRadioGroup
              row={true}
              value={fileUploaderComponent.displayMode}
              onChange={handleDisplayModeChange}
            >
              <AltinnRadio
                label={t('ux_editor.modal_properties_file_upload_simple')}
                value='simple'
              />
              <AltinnRadio
                label={t('ux_editor.modal_properties_file_upload_list')}
                value='list'
              />
            </AltinnRadioGroup>
          </Grid>
          <Grid
            item={true}
            xs={12}
          >
            {renderSelectTextFromResources(
              'modal_properties_label_helper',
              handleTitleChange,
              textResources,
              language,
              fileUploaderComponent.textResourceBindings?.title,
              fileUploaderComponent.textResourceBindings?.title,
            )}
            {renderSelectTextFromResources(
              'modal_properties_description_helper',
              handleDescriptionChange,
              textResources,
              language,
              fileUploaderComponent.textResourceBindings?.description,
              fileUploaderComponent.textResourceBindings?.description,
            )}
          </Grid>
          <Grid
            item={true}
            xs={12}
          >
            <AltinnRadioGroup
              row={true}
              value={fileUploaderComponent.hasCustomFileEndings ? 'true' : 'false'}
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
            </AltinnRadioGroup>
          </Grid>

          {fileUploaderComponent.hasCustomFileEndings && (
            <Grid
              item={true}
              xs={12}
            >
              <AltinnInputField
                id='modal-properties-valid-file-endings'
                onChangeFunction={handleValidFileEndingsChange}
                inputValue={fileUploaderComponent.validFileEndings}
                inputDescription={t('ux_editor.modal_properties_valid_file_endings_helper')}
                inputFieldStyling={{ width: '100%' }}
                inputDescriptionStyling={{ marginTop: '24px' }}
              />
            </Grid>
          )}
          <Grid
            item={true}
            xs={12}
          >
            <AltinnInputField
              id='modal-properties-minimum-files'
              textFieldId={`modal-properties-minimum-files-input-${fileUploaderComponent.id}`}
              onChangeFunction={handleNumberOfAttachmentsChange('min')}
              inputValue={fileUploaderComponent.minNumberOfAttachments || 0}
              inputDescription={t('ux_editor.modal_properties_minimum_files')}
              inputFieldStyling={{ width: '60px' }}
              inputDescriptionStyling={{ marginTop: '24px' }}
              type='number'
            />
          </Grid>
          <Grid
            item={true}
            xs={12}
          >
            <AltinnInputField
              id='modal-properties-maximum-files'
              textFieldId={`modal-properties-maximum-files-input-${fileUploaderComponent.id}`}
              onChangeFunction={handleNumberOfAttachmentsChange('max')}
              inputValue={fileUploaderComponent.maxNumberOfAttachments || 1}
              inputDescription={t('ux_editor.modal_properties_maximum_files')}
              inputFieldStyling={{ width: '60px' }}
              inputDescriptionStyling={{ marginTop: '24px' }}
              type='number'
            />
          </Grid>
          <Grid
            item={true}
            xs={12}
          >
            <AltinnInputField
              id='modal-properties-file-size'
              onChangeFunction={handleMaxFileSizeInMBChange}
              inputValue={fileUploaderComponent.maxFileSizeInMB || 0}
              inputDescription={t('ux_editor.modal_properties_maximum_file_size')}
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
              {t('ux_editor.modal_properties_maximum_file_size_helper')}
            </Typography>
          </Grid>
        </Grid>
      );
    }

    case ComponentTypes.FileUploadWithTag: {
      return (
        <Grid>
          {renderChangeId()}
          <FileUploadWithTagComponent
            component={component as IFormFileUploaderWithTagComponent}
            stateComponent={component}
            language={language}
            textResources={textResources}
            handleComponentUpdate={handleComponentUpdate}
            handleTitleChange={handleTitleChange}
            handleDescriptionChange={handleDescriptionChange}
            handleOptionsIdChange={handleOptionsIdChange}
            handleNumberOfAttachmentsChange={handleNumberOfAttachmentsChange}
            handleMaxFileSizeInMBChange={handleMaxFileSizeInMBChange}
            handleHasCustomFileEndingsChange={handleHasCustomFileEndingsChange}
            handleValidFileEndingsChange={handleValidFileEndingsChange}
          />
        </Grid>
      );
    }

    case ComponentTypes.Image: {
      return (
        <Grid>
          {renderChangeId()}
          <ImageComponent
            component={component as IFormImageComponent}
            handleComponentUpdate={handleComponentUpdate}
            language={language}
            textResources={textResources}
          />
        </Grid>
      );
    }

    default: {
      return <>{renderChangeId()}</>;
    }
  }
};
