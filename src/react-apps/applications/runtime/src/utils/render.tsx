import { Typography } from '@material-ui/core';
import React = require('react');
import Select from 'react-select';
import CreatableSelect from 'react-select/lib/Creatable';
import { customInput } from '../components/config/EditModalContent';
import { SelectDataModelComponent } from '../components/config/SelectDataModelComponent';
import MessageComponent, { MessageType } from '../components/message/MessageComponent';
import { formatCreateTextLabel, getTextResource, truncate } from './language';

export const styles = {
  inputHelper: {
    marginTop: '2.4rem',
    fontSize: '1.6rem',
    lineHeight: '3.2rem',
  },
};

export function renderPropertyLabel(textKey: string) {
  return (
    <Typography style={styles.inputHelper}>
      {textKey}
    </Typography>
  );
}

export function noOptionsMessage(language: any): string {
  return language.general.no_options;
}

export function renderSelectDataModelBinding(
  dataModelBinding: IDataModelBindings = {},
  onDataModelChange: any,
  language: any,
  label?: string,
  returnValue?: any,
  key: string = 'simpleBinding',
): JSX.Element {
  return (
    <div>
      {renderPropertyLabel(label ?
        language.ux_editor.modal_properties_data_model_helper + ' ' + language.general.for + ' ' + label :
        language.ux_editor.modal_properties_data_model_helper)
      }
      <SelectDataModelComponent
        selectedElement={dataModelBinding[key]}
        // tslint:disable-next-line:jsx-no-lambda
        onDataModelChange={(dataModelField) => onDataModelChange(dataModelField, returnValue)}
        language={language}
        // tslint:disable-next-line:jsx-no-lambda
        noOptionsMessage={() => noOptionsMessage(language)}
      />
    </div>
  );
}

export function renderSelectTextFromResources(
  labelText: string,
  onChangeFunction: (e: any, returnValue?: string) => void,
  textResources: ITextResource[],
  language: any,
  placeholder?: string,
  returnValue?: string,
  truncateLimit: number = 80,
  createNewTextAllowed: boolean = false,
): JSX.Element {
  const resources: any = [];
  if (textResources) {
    textResources.forEach((textResource: any) => {
      const option = truncate(textResource.value, truncateLimit);
      resources.push({ value: textResource.id, label: option.concat('\n(', textResource.id, ')') });
    });
  }
  return (
    <div>
      {renderPropertyLabel(language.ux_editor[labelText])}
      {createNewTextAllowed ?
        <CreatableSelect
          styles={customInput}
          options={resources}
          defaultValue={''}
          // tslint:disable-next-line:jsx-no-lambda
          onChange={(value) => onChangeFunction(value, returnValue)}
          isClearable={true}
          placeholder={placeholder ?
            truncate(getTextResource(placeholder, textResources), 40)
            : language.general.search}
          // tslint:disable-next-line:jsx-no-lambda
          formatCreateLabel={(inputValue: string) => formatCreateTextLabel(inputValue, language)}
          // tslint:disable-next-line:jsx-no-lambda
          noOptionsMessage={() => noOptionsMessage(language)}
        />
        :
        <Select
          styles={customInput}
          options={resources}
          defaultValue={''}
          // tslint:disable-next-line:jsx-no-lambda
          onChange={(value) => onChangeFunction(value, returnValue)}
          isClearable={true}
          placeholder={placeholder ?
            truncate(getTextResource(placeholder, textResources), 40)
            : language.general.search}
          // tslint:disable-next-line:jsx-no-lambda
          noOptionsMessage={() => noOptionsMessage(language)}
        />
      }
    </div>
  );
}

export function renderValidationMessagesForComponent(
  validationMessages: IComponentBindingValidation,
  id: string,
): JSX.Element[] {
  if (!validationMessages) {
    return null;
  }

  const validationMessageElements: JSX.Element[] = [];
  if (validationMessages.errors && validationMessages.errors.length > 0) {
    validationMessageElements.push(renderValidationMessages(validationMessages.errors, `error_${id}`, 'error'));
  }

  if (validationMessages.warnings && validationMessages.warnings.length > 0) {
    validationMessageElements.push(renderValidationMessages(validationMessages.warnings, `info_${id}`, 'info'));
  }

  return validationMessageElements.length > 0 ? validationMessageElements : null;
}

export function renderValidationMessages(messages: string[], id: string, messageType: MessageType) {
  return (
    <MessageComponent
      messageType={messageType}
      style={{display: 'block', width: 'fit-content'}}
      key={'messageType'}
      id={id}
    >
    <ol>
      {messages.map((message: string, idx: number) => {
        return (
          <li key={idx}>{message}</li>
        );
      })}
      </ol>
    </MessageComponent>
  );
}
