import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import AltinnRadio from 'app-shared/components/AltinnRadio';
import AltinnRadioGroup from 'app-shared/components/AltinnRadioGroup';
import { getLanguageFromKey } from 'app-shared/utils/language';
import Select from 'react-select';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import {
  renderSelectDataModelBinding,
  SelectTextFromRecources
} from '../../utils/render';
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
import { Checkbox, FieldSet, TextField } from '@altinn/altinn-design-system';

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
      <div>
        <TextField
          id={`component-id-input${component.id}`}
          label={t('ux_editor.modal_properties_component_change_id')}
          onBlur={handleNewId}
          onChange={handleIdChange}
          value={tmpId ?? ""}
        />
        <div ref={errorMessageRef} />
        <ErrorPopover
          anchorEl={error ? errorMessageRef.current : null}
          onClose={handleClosePopup}
          errorMessage={error}
        />
      </div>
    );
  };
  switch (component.type) {
    case ComponentTypes.Header: {
      return (
        <FieldSet className={classes.fieldset}>
          <HeaderSizeSelectComponent
            renderChangeId={renderChangeId}
            component={component}
            language={language}
            textResources={textResources}
            handleTitleChange={handleTitleChange}
            handleUpdateHeaderSize={handleUpdateHeaderSize}
          />
        </FieldSet>
      );
    }
    case ComponentTypes.Datepicker:
    case ComponentTypes.TextArea:
    case ComponentTypes.Input: {
      return (
        <FieldSet className={classes.fieldset}>
          {renderChangeId()}
          <EditBoilerplate
            component={component}
            textResources={textResources}
            handleDataModelChange={handleDataModelChange}
            handleTitleChange={handleTitleChange}
            handleDescriptionChange={handleDescriptionChange}
            language={language}
          />
          <div className={classes.gridItem}>
            <Checkbox
              checked={component.readOnly}
              label={language['ux_editor.modal_configure_read_only']}
              onChange={(e) => handleReadOnlyChange(e, e.target.checked)}
            />
          </div>
          <div>
            <Checkbox
              checked={component.required}
              label={language['ux_editor.modal_configure_required']}
              onChange={(e) => handleRequiredChange(e, e.target.checked)}
            />
          </div>
        </FieldSet>
      );
    }
    case ComponentTypes.AttachmentList: {
      return (
        <FieldSet className={classes.fieldset}>
          {renderChangeId()}
          <SelectTextFromRecources
            description={component.textResourceBindings?.title}
            labelText={'modal_properties_label_helper'}
            language={language}
            onChangeFunction={handleTitleChange}
            placeholder={component.textResourceBindings?.title}
            textResources={textResources}
          />
        </FieldSet>
      );
    }
    case ComponentTypes.Paragraph: {
      return (
        <FieldSet className={classes.fieldset}>
          {renderChangeId()}
          <SelectTextFromRecources
            description={component.textResourceBindings?.title}
            labelText={'modal_properties_paragraph_helper'}
            language={language}
            onChangeFunction={handleTitleChange}
            placeholder={component.textResourceBindings?.title}
            textResources={textResources}
          />
        </FieldSet>
      );
    }
    case ComponentTypes.Checkboxes:
    case ComponentTypes.RadioButtons: {
      return (
        <FieldSet className={classes.fieldset}>
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
        </FieldSet>
      );
    }
    case ComponentTypes.Dropdown: {
      return (
        <FieldSet className={classes.fieldset}>
          {renderChangeId()}
          <EditBoilerplate
            component={component}
            textResources={textResources}
            handleDataModelChange={handleDataModelChange}
            handleTitleChange={handleTitleChange}
            handleDescriptionChange={handleDescriptionChange}
            language={language}
          />
          <div className={classes.gridItem}>
            <Checkbox
              checked={component.readOnly}
              label={language['ux_editor.modal_configure_read_only']}
              onChange={(e) => handleReadOnlyChange(e, e.target.checked)}
            />
          </div>
          <div>
            <Checkbox
              checked={component.required}
              label={language['ux_editor.modal_configure_required']}
              onChange={(e) => handleRequiredChange(e, e.target.checked)}
            />
          </div>
          <div>
            <TextField
              id='modal-properties-code-list-id'
              label={t('ux_editor.modal_properties_code_list_id')}
              onChange={handleOptionsIdChange}
              value={'optionsId' in component ? component.optionsId : ''}
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
        </FieldSet>
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
        <FieldSet className={classes.fieldset}>
          {renderChangeId()}
          <div>
            <p className={classes.inputHelper}>
              {t('ux_editor.modal_properties_button_type_helper')}
            </p>
            <Select
              options={types}
              value={types.find((element) => element.value === component.type)}
              onChange={handleButtonTypeChange}
              placeholder={t('ux_editor.modal_properties_button_type_submit')}
            />
          </div>
          {component.type === 'Button' && (
            <SelectTextFromRecources
              description={t('ux_editor.modal_properties_button_type_submit')}
              labelText={'modal_properties_button_helper'}
              language={language}
              onChangeFunction={handleTitleChange}
              placeholder={component.textResourceBindings?.title}
              textResources={textResources}
            />
          )}
        </FieldSet>
      );
    }

    case ComponentTypes.AddressComponent: {
      return (
        <FieldSet className={classes.fieldset}>
          {renderChangeId()}
          <div>
            <Checkbox
              checked={(component as IFormAddressComponent).simplified}
              label={t('ux_editor.modal_configure_address_component_simplified')}
              onChange={(e) => handleToggleAddressSimple(e, e.target.checked)}
            />
          </div>
          <SelectTextFromRecources
            description={component.textResourceBindings?.title}
            labelText={'modal_properties_label_helper'}
            language={language}
            onChangeFunction={handleTitleChange}
            placeholder={component.textResourceBindings?.title}
            textResources={textResources}
          />
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
        </FieldSet>
      );
    }

    case ComponentTypes.FileUpload: {
      const fileUploaderComponent = component as IFormFileUploaderComponent;
      return (
        <FieldSet className={classes.fieldset}>
          {renderChangeId()}
          <div>
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
          </div>
          <FieldSet className={classes.fieldset}>
            <SelectTextFromRecources
              description={fileUploaderComponent.textResourceBindings?.title}
              labelText={'modal_properties_label_helper'}
              language={language}
              onChangeFunction={handleTitleChange}
              placeholder={fileUploaderComponent.textResourceBindings?.title}
              textResources={textResources}
            />
            <SelectTextFromRecources
              description={fileUploaderComponent.textResourceBindings?.description}
              labelText={'modal_properties_description_helper'}
              language={language}
              onChangeFunction={handleDescriptionChange}
              placeholder={fileUploaderComponent.textResourceBindings?.description}
              textResources={textResources}
            />
          </FieldSet>
          <div>
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
          </div>

          {fileUploaderComponent.hasCustomFileEndings && (
            <TextField
              id='modal-properties-valid-file-endings'
              label={t('ux_editor.modal_properties_valid_file_endings_helper')}
              onChange={handleValidFileEndingsChange}
              value={fileUploaderComponent.validFileEndings}
            />
          )}
          <div>
            <TextField
              formatting={{ number: {} }}
              id={`modal-properties-minimum-files-input-${fileUploaderComponent.id}`}
              label={t('ux_editor.modal_properties_minimum_files')}
              onChange={handleNumberOfAttachmentsChange('min')}
              value={(fileUploaderComponent.minNumberOfAttachments || 0).toString()}
            />
          </div>
          <div>
            <TextField
              formatting={{ number: {} }}
              id={`modal-properties-maximum-files-input-${fileUploaderComponent.id}`}
              label={t('ux_editor.modal_properties_maximum_files')}
              onChange={handleNumberOfAttachmentsChange('max')}
              value={(fileUploaderComponent.maxNumberOfAttachments || 1).toString()}
            />
          </div>
          <div>
            <TextField
              formatting={{ number: {} }}
              id='modal-properties-file-size'
              label={`${t('ux_editor.modal_properties_maximum_file_size')} (${t('ux_editor.modal_properties_maximum_file_size_helper')})`}
              onChange={handleMaxFileSizeInMBChange}
              value={(fileUploaderComponent.maxFileSizeInMB || 0).toString()}
            />
          </div>
        </FieldSet>
      );
    }

    case ComponentTypes.FileUploadWithTag: {
      return (
        <FieldSet className={classes.fieldset}>
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
        </FieldSet>
      );
    }

    case ComponentTypes.Image: {
      return (
        <FieldSet className={classes.fieldset}>
          {renderChangeId()}
          <ImageComponent
            component={component as IFormImageComponent}
            handleComponentUpdate={handleComponentUpdate}
            language={language}
            textResources={textResources}
          />
        </FieldSet>
      );
    }

    default: {
      return <>{renderChangeId()}</>;
    }
  }
};
