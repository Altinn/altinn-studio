import React from 'react';
import { EditComponentId } from './editModal/EditComponentId';
import { Accordion, Alert, Heading, Paragraph } from '@digdir/design-system-react';
import type { FormComponent } from '../../types/FormComponent';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { EditDataModelBindings } from './editModal/EditDataModelBindings';
import { EditTextResourceBindings } from './editModal/EditTextResourceBindings';
import { EditBooleanValue } from './editModal/EditBooleanValue';
import { EditNumberValue } from './editModal/EditNumberValue';
import { EditOptions } from './editModal/EditOptions';
import { EditStringValue } from './editModal/EditStringValue';
import { useSelector } from 'react-redux';
import { useText } from '../../hooks';
import { getComponentPropertyLabel } from '../../utils/language';

export interface IEditFormComponentProps {
  editFormId: string;
  component: FormComponent;
  handleComponentUpdate: (component: FormComponent) => void;
}

const supportedPropertyTypes = ['boolean', 'number', 'integer', 'string', 'object'];
const supportedPropertyRefs = [
  'https://altinncdn.no/schemas/json/layout/expression.schema.v1.json#/definitions/boolean',
];

const knownUnsupportedPropertyKeys = ['children'];

export const isPropertyTypeSupported = (property: any, propertyKey: string) => {
  if (propertyKey === 'children') return false;
  if (property.$ref) {
    return supportedPropertyRefs.includes(property.$ref);
  }
  if (property?.type === 'array' && property?.items?.type === 'string') {
    return true;
  }
  return supportedPropertyTypes.includes(property.type);
};

export interface FormComponentConfigProps extends IEditFormComponentProps {
  schema: any;
  hideUnsupported?: boolean;
}
export const FormComponentConfig = ({
  schema,
  editFormId,
  component,
  handleComponentUpdate,
  hideUnsupported,
}: FormComponentConfigProps) => {
  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const t = useText();

  if (!schema?.properties) return null;

  const {
    textResourceBindings,
    dataModelBindings,
    required,
    readOnly,
    id,
    type,
    options,
    optionsId,
    hasCustomFileEndings,
    validFileEndings,
    children,
    ...rest
  } = schema.properties;

  const unsupportedPropertyKeys: string[] = knownUnsupportedPropertyKeys.concat(Object.keys(rest).filter((propertyKey) => {
    return !isPropertyTypeSupported(rest[propertyKey], propertyKey);
  }));
  return (
    <>
      {id && (
        <EditComponentId
          component={component}
          handleComponentUpdate={handleComponentUpdate}
          helpText={id.description}
        />
      )}
      {textResourceBindings?.properties && (
        <>
          <Heading level={3} size='xxsmall'>
            {t('general.text')}
          </Heading>
          <EditTextResourceBindings
            component={component}
            handleComponentChange={handleComponentUpdate}
            textResourceBindingKeys={Object.keys(textResourceBindings.properties)}
            editFormId={editFormId}
            layoutName={selectedLayout}
          />
        </>
      )}
      {dataModelBindings?.properties && (
        <>
          <Heading level={3} size='xxsmall'>
            {t('top_menu.datamodel')}
          </Heading>
          {Object.keys(dataModelBindings?.properties).map((propertyKey: any) => {
            return (
              <EditDataModelBindings
                key={`${component.id}-datamodel-${propertyKey}`}
                component={component}
                handleComponentChange={handleComponentUpdate}
                editFormId={editFormId}
                helpText={dataModelBindings?.properties[propertyKey]?.description}
                renderOptions={{
                  key: propertyKey,
                  label: propertyKey !== 'simpleBinding' ? propertyKey : undefined,
                }}
              />
            );
          })}
        </>
      )}
      {!hideUnsupported && <Heading level={3} size='xxsmall'>
            {'Andre innstillinger'}
          </Heading>}
      {options && optionsId && (
        <EditOptions
          component={component as any}
          editFormId={editFormId}
          handleComponentChange={handleComponentUpdate}
        />
      )}

      {hasCustomFileEndings && (
        <>
          <EditBooleanValue
            propertyKey='hasCustomFileEndings'
            helpText={hasCustomFileEndings.description}
            component={component}
            handleComponentChange={(updatedComponent: FormComponent) => {
              if (!updatedComponent.hasCustomFileEndings) {
                handleComponentUpdate({
                  ...updatedComponent,
                  validFileEndings: undefined,
                });
                return;
              }
              handleComponentUpdate(updatedComponent);
            }}
          />
          {component['hasCustomFileEndings'] && (
            <EditStringValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey='validFileEndings'
              helpText={validFileEndings?.description}
            />
          )}
        </>
      )}

      {readOnly && (
        <EditBooleanValue
          propertyKey='readOnly'
          helpText={readOnly.description}
          component={component}
          handleComponentChange={handleComponentUpdate}
        />
      )}
      {required && (
        <EditBooleanValue
          propertyKey='required'
          helpText={required.description}
          component={component}
          handleComponentChange={handleComponentUpdate}
        />
      )}
      {Object.keys(rest).map((propertyKey) => {
        if (
          rest[propertyKey].type === 'boolean' ||
          rest[propertyKey].$ref?.endsWith('layout/expression.schema.v1.json#/definitions/boolean')
        ) {
          return (
            <EditBooleanValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey={propertyKey}
              key={propertyKey}
              helpText={rest[propertyKey]?.description}
            />
          );
        }
        if (rest[propertyKey].type === 'number' || rest[propertyKey].type === 'integer') {
          return (
            <EditNumberValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey={propertyKey}
              key={propertyKey}
              helpText={rest[propertyKey]?.description}
            />
          );
        }
        if (rest[propertyKey].type === 'string') {
          return (
            <EditStringValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey={propertyKey}
              key={propertyKey}
              helpText={rest[propertyKey]?.description}
              enumValues={rest[propertyKey]?.enum}
            />
          );
        }
        if (rest[propertyKey].type === 'array' && rest[propertyKey].items?.type === 'string') {
          return (
            <EditStringValue
              component={component}
              handleComponentChange={handleComponentUpdate}
              propertyKey={propertyKey}
              key={propertyKey}
              helpText={rest[propertyKey]?.description}
              enumValues={rest[propertyKey]?.items?.enum}
              multiple={true}
            />
          );
        }
        if (rest[propertyKey].type === 'object' && rest[propertyKey].properties) {
          return (
            <Accordion key={propertyKey}>
              <Accordion.Item>
                <Accordion.Header>{getComponentPropertyLabel(propertyKey, t)}</Accordion.Header>
                <Accordion.Content>
                  {rest[propertyKey]?.description && (
                    <Paragraph size='small'>{rest[propertyKey].description}</Paragraph>
                  )}
                <FormComponentConfig
                key={propertyKey}
                schema={rest[propertyKey]}
                component={component[propertyKey] || {}}
                handleComponentUpdate={(updatedComponent: FormComponent) => {
                  handleComponentUpdate({
                    ...component,
                    [propertyKey]: updatedComponent,
                  });
                }}
                editFormId={editFormId}
                hideUnsupported
              />
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          );
        }
        return null;
      })}
      {/* Show information about unsupported properties if there are any */}
      {unsupportedPropertyKeys.length > 0 && !hideUnsupported && (
        <Alert severity='info'>
          {t('ux_editor.edit_component.unsupported_properties_message')}
          <ul>
            {unsupportedPropertyKeys.length > 0 &&
              unsupportedPropertyKeys.map((propertyKey) => (
                <li key={propertyKey}>{propertyKey}</li>
              ))}
          </ul>
        </Alert>
      )}
    </>
  );
};
