import { Typography } from '@material-ui/core';
import React = require('react');
import Select from 'react-select';
import CreatableSelect from 'react-select/lib/Creatable';
import { customInput } from '../components/config/EditModalContent';
import { SelectDataModelComponent } from '../components/config/SelectDataModelComponent';
import { formatCreateTextLabel, getTextResource, truncate } from './language';

export const styles = {
  inputHelper: {
    marginTop: '1em',
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

const noOptionsMessage = (language: any): string => {
  return language.general.no_options;
};

export function renderSelectDataModelBinding(
  selectedElement: any,
  onDataModelChange: any,
  language: any,
): JSX.Element {
  return (
    <div>
      {renderPropertyLabel(language.ux_editor.modal_properties_data_model_helper)}
      <SelectDataModelComponent
        selectedElement={selectedElement}
        onDataModelChange={onDataModelChange}
        language={language}
        // tslint:disable-next-line:jsx-no-lambda
        noOptionsMessage={() => noOptionsMessage(language)}
      />
    </div>
  );
}

export function renderSelectTextFromResources(
  labelText: string,
  onChangeFunction: (e: any) => void,
  resource: any[],
  language: any,
  textResources: any,
  placeholder?: string,
  truncateLimit: number = 80,
  createNewTextAllowed: boolean = true,
  resourceType: string = 'text',
): JSX.Element {
  const resources: any = [];
  // codelist and option passes index of selected value
  let tmpPlaceholder = placeholder;
  if (resource) {
    if (resourceType === 'text') {
      resource.map((textResource: any) => {
        const option = truncate(textResource.value, truncateLimit);
        resources.push({ value: textResource.id, label: option.concat('\n(', textResource.id, ')') });
      });
    } else if (resourceType === 'codelist') {
      resource.map((codeListResource: any, index: number) => {
        resources.push({
          value: codeListResource.codeListName,
          label: codeListResource.codeListName,
          index,
        });
      });
      if (placeholder) {
        placeholder = truncate(placeholder, truncateLimit);
      }
    } else if (resourceType === 'option') {
      resource.map((option: any, index: number) => {
        resources.push({ value: option.value, label: option.label, index });
      });
      if (placeholder) {
        tmpPlaceholder = resources[placeholder].value;
      }
    }
  }
  return (
    <div>
      {renderPropertyLabel(language.ux_editor[labelText])}
      {createNewTextAllowed ?
        <CreatableSelect
          styles={customInput}
          options={resources}
          defaultValue={''}
          onChange={onChangeFunction}
          isClearable={true}
          placeholder={tmpPlaceholder ?
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
          onChange={onChangeFunction}
          isClearable={true}
          placeholder={tmpPlaceholder ?
            truncate(getTextResource(tmpPlaceholder, textResources), 40)
            : language.general.search}
          // tslint:disable-next-line:jsx-no-lambda
          noOptionsMessage={() => noOptionsMessage(language)}
        />
      }
    </div>
  );
}
