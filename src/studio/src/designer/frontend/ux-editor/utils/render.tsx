/* eslint-disable max-len */
import { Typography } from '@material-ui/core';
import * as React from 'react';
import Select from 'react-select';
import { SelectDataModelComponent } from '../components/config/SelectDataModelComponent';
import { getTextResource, truncate } from './language';

export const styles = {
  inputHelper: {
    marginTop: '2.4rem',
    fontSize: '1.6rem',
    lineHeight: 'auto',
    color: '#000000',
  },
  optional: {
    marginTop: '2.4rem',
    marginLeft: '0.4rem',
    color: '#6A6A6A',
    fontSize: '1.4rem',
  },
  description: {
    fontSize: '1.4rem',
  },
};

export const selectStyles = {
  control: (base: any) => ({
    ...base,
    borderRadius: '0 !important',
  }),
  option: (provided: any) => ({
    ...provided,
    whiteSpace: 'pre-wrap',
  }),
};

export function renderPropertyLabel(textKey: string) {
  return <Typography style={styles.inputHelper}>{textKey}</Typography>;
}

export function renderOptionalLabel(text: string) {
  return <Typography style={styles.optional}>{`(${text.toLowerCase()})`}</Typography>;
}

export function renderDescription(text: string) {
  return <Typography style={styles.description}>{text}</Typography>;
}

export function noOptionsMessage(language: any): string {
  return language.general.no_options;
}

export function renderSelectDataModelBinding(
  dataModelBinding: IDataModelBindings,
  onDataModelChange: any,
  language: any,
  label?: string,
  returnValue?: any,
  key: string = 'simpleBinding',
  uniqueKey?: any,
): JSX.Element {
  const onDMChange = (dataModelField: any) => onDataModelChange(dataModelField, returnValue);
  const noOptMessage = () => noOptionsMessage(language);
  return (
    <div key={uniqueKey || ''}>
      {renderPropertyLabel(
        label
          ? `${language.ux_editor.modal_properties_data_model_helper} ${language.general.for} ${label}`
          : language.ux_editor.modal_properties_data_model_helper,
      )}
      <SelectDataModelComponent
        selectedElement={dataModelBinding[key]}
        onDataModelChange={onDMChange}
        language={language}
        noOptionsMessage={noOptMessage}
      />
    </div>
  );
}

export function renderSelectGroupDataModelBinding(
  dataModelBinding: IDataModelBindings,
  onDataModelChange: any,
  language: any,
  key: string = 'simpleBinding',
): JSX.Element {
  return (
    <div>
      {renderPropertyLabel(language.ux_editor.modal_properties_data_model_helper)}
      <SelectDataModelComponent
        selectedElement={dataModelBinding[key]}
        // tslint:disable-next-line:jsx-no-lambda
        onDataModelChange={(dataModelField) => onDataModelChange(dataModelField, key)}
        language={language}
        selectGroup={true}
        // tslint:disable-next-line:jsx-no-lambda
        noOptionsMessage={() => noOptionsMessage(language)}
      />
    </div>
  );
}

interface IInnerProps {
  labelText: string,
  onChangeFunction: (e: any) => void,
  textResources: ITextResource[],
  language: any,
  selected?: string,
  placeholder?: string,
  description?: string,
}
function SelectTextFromRecources(props: React.PropsWithChildren<IInnerProps>) {
  const {
    labelText,
    onChangeFunction,
    textResources,
    language,
    selected,
    placeholder,
    description,
    children,
  } = props;
  const resources = !textResources
    ? []
    : textResources.map((textResource: any) => {
      const option = truncate(textResource.value, 80);
      return { value: textResource.id, label: `${option}\n(${textResource.id})` };
    });
  const defaultValue = !selected ? undefined : resources.find(({ value }) => value === selected);
  const onChange = (value: any) => onChangeFunction(value);
  const noOptMessage = () => noOptionsMessage(language);
  const placeholderText = placeholder
    ? truncate(getTextResource(placeholder, textResources), 40)
    : language.ux_editor[labelText];
  return (
    <div>
      <div style={{ display: 'flex' }}>
        {renderPropertyLabel(language.ux_editor[labelText])}
        {children}
      </div>
      {description && renderDescription(description)}
      <Select
        defaultValue={defaultValue}
        styles={selectStyles}
        options={resources}
        onChange={onChange}
        isClearable={true}
        placeholder={!defaultValue && placeholderText}
        noOptionsMessage={noOptMessage}
      />
    </div>
  );
}

export function renderSelectTextFromResources(
  labelText: string,
  onChangeFunction: (e: any) => void,
  textResources: ITextResource[],
  language: any,
  selected?: string,
  placeholder?: string,
  description?: string,
): JSX.Element {
  return (
    <SelectTextFromRecources
      labelText={labelText}
      onChangeFunction={onChangeFunction}
      textResources={textResources}
      language={language}
      selected={selected}
      placeholder={placeholder}
      description={description}
    />
  );
}

export function renderOptionalSelectTextFromResources(
  labelText: string,
  onChangeFunction: (e: any) => void,
  textResources: ITextResource[],
  language: any,
  selected?: string,
  placeholder?: string,
  description?: string,
): JSX.Element {
  return (
    <SelectTextFromRecources
      labelText={labelText}
      onChangeFunction={onChangeFunction}
      textResources={textResources}
      language={language}
      selected={selected}
      placeholder={placeholder}
      description={description}
    >{renderOptionalLabel(language.general.optional)}
    </SelectTextFromRecources>
  );
}
