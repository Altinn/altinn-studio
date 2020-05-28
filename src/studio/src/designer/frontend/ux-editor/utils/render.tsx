import { Typography } from '@material-ui/core';
import * as React from 'react';
import Select from 'react-select';
// eslint-disable-next-line import/no-cycle
import { customInput } from '../components/config/EditModalContent';
import { SelectDataModelComponent } from '../components/config/SelectDataModelComponent';
// eslint-disable-next-line import/no-cycle
import { getTextResource, truncate } from './language';

export const styles = {
  inputHelper: {
    marginTop: '2.4rem',
    fontSize: '1.6rem',
    lineHeight: 'auto',
    color: '#000000',
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
  uniqueKey?: any,
): JSX.Element {
  return (
    <div key={uniqueKey || ''}>
      {renderPropertyLabel(label ?
        `${language.ux_editor.modal_properties_data_model_helper}${language.general.for}${label}` :
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
      {!createNewTextAllowed &&
        /* TODO: add back in when creating new texts is allowed
          <CreatableSelect
            styles={customInput}
            options={resources}
            defaultValue={placeholder ?
              { value: placeholder, label: truncate(getTextResource(placeholder, textResources), 40) } : ''}
            // tslint:disable-next-line:jsx-no-lambda
            onChange={(value) => onChangeFunction(value, returnValue)}
            isClearable={true}
            placeholder={placeholder ?
              truncate(getTextResource(placeholder, textResources), 40)
              : language.ux_editor[labelText]}
            // tslint:disable-next-line:jsx-no-lambda
            formatCreateLabel={(inputValue: string) => formatCreateTextLabel(inputValue, language)}
            // tslint:disable-next-line:jsx-no-lambda
            noOptionsMessage={() => noOptionsMessage(language)}
          /> */
        <Select
          styles={customInput}
          options={resources}
          // tslint:disable-next-line:jsx-no-lambda
          onChange={(value) => onChangeFunction(value, returnValue)}
          isClearable={true}
          placeholder={placeholder ?
            truncate(getTextResource(placeholder, textResources), 40)
            : language.ux_editor[labelText]}
          // tslint:disable-next-line:jsx-no-lambda
          noOptionsMessage={() => noOptionsMessage(language)}
        />
      }
    </div>
  );
}
