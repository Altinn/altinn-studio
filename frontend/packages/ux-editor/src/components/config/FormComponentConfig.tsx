import React from 'react';
import { EditComponentId } from './editModal/EditComponentId';
import { Alert, Heading } from '@digdir/design-system-react';
import type { FormComponent } from '../../types/FormComponent';
import { useFormLayoutsSelector } from '../../hooks';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { EditDataModelBindings } from './editModal/EditDataModelBindings';
import { EditTextResourceBindings } from './editModal/EditTextResourceBindings';
import { EditBooleanValue } from './editModal/EditBooleanValue';
import { EditNumberValue } from './editModal/EditNumberValue';
import { EditOptions } from './editModal/EditOptions';
import { EditStringValue } from './editModal/EditStringValue';

export interface IEditFormComponentProps {
  editFormId: string;
  component: FormComponent;
  handleComponentUpdate: (component: FormComponent) => void;
}

const supportedPropertyTypes = ['boolean', 'number', 'integer', 'string'];
const supportedPropertyRefs = [
  'https://altinncdn.no/schemas/json/layout/expression.schema.v1.json#/definitions/boolean',
];

export const isPropertyTypeSupported = (property: any) => {
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
  const selectedLayout = useFormLayoutsSelector(selectedLayoutNameSelector);
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
    ...rest
  } = schema.properties;

  const unsupportedPropertyKeys: string[] = Object.keys(rest).filter((propertyKey) => {
    return !isPropertyTypeSupported(rest[propertyKey]);
  });
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
            Tekster
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
            Datamodell
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
        // Disabled for now, as we need a better way to handle updating nested objects.
        /* if (rest[propertyKey].type === 'object' && rest[propertyKey].properties) {
          return (
            <>
              <Heading level={3} size='xxsmall'>
                {propertyKey}
              </Heading>
              <FormComponentConfig
                key={propertyKey}
                schema={rest[propertyKey]}
                component={component}
                handleComponentUpdate={(updatedComponent: FormComponent) => {
                  Object.keys(rest[propertyKey].properties).forEach((nestedPropertyKey) => {
                    if (updatedComponent[nestedPropertyKey]) {
                      updatedComponent[propertyKey] = {
                        ...updatedComponent[propertyKey],
                        [nestedPropertyKey]: updatedComponent[nestedPropertyKey],
                      };
                      delete updatedComponent[nestedPropertyKey];
                    }
                  });
                  handleComponentUpdate(updatedComponent);
                }}
                editFormId={editFormId}
                hideUnsupported
              />
            </>
          );
        } */
        return null;
      })}
      {unsupportedPropertyKeys.length && !hideUnsupported && (
        <Alert severity='info'>
          Vi jobber med å automatisere støtte for alle innstillinger. Følgende innstillinger er ikke
          støttet automatisk i skjemaeditor ennå, men kan konfigureres manuelt:
          <ul>
            {unsupportedPropertyKeys.length > 0 &&
              unsupportedPropertyKeys.map((propertyKey) => (
                <li key={propertyKey}>{propertyKey}</li>
              ))}
          </ul>
          OBS! Noen komponenter har likevel støtte for noen av innstillingene i listen. Det vil i så
          fall vises under dette panelet.
        </Alert>
      )}
    </>
  );
};
