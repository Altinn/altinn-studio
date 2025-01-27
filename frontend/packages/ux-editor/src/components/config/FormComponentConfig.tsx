import React, { useState } from 'react';
import { Alert, Card, Heading, Paragraph } from '@digdir/designsystemet-react';
import type { FormComponent } from '../../types/FormComponent';
import { EditBooleanValue } from './editModal/EditBooleanValue';
import { EditNumberValue } from './editModal/EditNumberValue';
import { EditStringValue } from './editModal/EditStringValue';
import { useComponentPropertyLabel, useText } from '../../hooks';
import {
  PropertyTypes,
  propertyKeysToExcludeFromComponentConfig,
  getSupportedPropertyKeysForPropertyType,
} from '../../utils/component';
import { EditGrid } from './editModal/EditGrid';
import type { FormItem } from '../../types/FormItem';
import type { UpdateFormMutateOptions } from '../../containers/FormItemContext';
import { useComponentPropertyDescription } from '../../hooks/useComponentPropertyDescription';
import classes from './FormComponentConfig.module.css';
import { RedirectToLayoutSet } from './editModal/RedirectToLayoutSet';
import { ChevronDownIcon, ChevronUpIcon } from '@studio/icons';
import { StudioProperty } from '@studio/components';

export interface IEditFormComponentProps {
  editFormId: string;
  component: FormItem;
  handleComponentUpdate: (component: FormItem, mutateOptions?: UpdateFormMutateOptions) => void;
}

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
  const t = useText();
  const componentPropertyLabel = useComponentPropertyLabel();
  const componentPropertyDescription = useComponentPropertyDescription();
  const [showOtherComponents, setShowOtherComponents] = useState(false);

  if (!schema?.properties) return null;

  const { properties } = schema;
  const { hasCustomFileEndings, grid, layoutSet } = properties;

  // Add any properties that have a custom implementation to this list so they are not duplicated in the generic view
  const customProperties = [
    'hasCustomFileEndings',
    'validFileEndings',
    'grid',
    'layoutSet',
    'children',
    'dataTypeIds',
    'target',
    'tableColumns',
    'overrides',
  ];

  const booleanPropertyKeys: string[] = getSupportedPropertyKeysForPropertyType(
    schema.properties,
    [PropertyTypes.boolean],
    customProperties,
  );
  const stringPropertyKeys: string[] = getSupportedPropertyKeysForPropertyType(
    schema.properties,
    [PropertyTypes.string],
    customProperties,
  );
  const numberPropertyKeys: string[] = getSupportedPropertyKeysForPropertyType(
    schema.properties,
    [PropertyTypes.number, PropertyTypes.integer],
    customProperties,
  );
  const arrayPropertyKeys: string[] = getSupportedPropertyKeysForPropertyType(
    schema.properties,
    [PropertyTypes.array],
    customProperties,
  );
  const objectPropertyKeys: string[] = getSupportedPropertyKeysForPropertyType(
    schema.properties,
    [PropertyTypes.object],
    [...customProperties, 'source'],
  );

  const unsupportedPropertyKeys: string[] = Object.keys(properties).filter((key) => {
    return (
      !booleanPropertyKeys.includes(key) &&
      !stringPropertyKeys.includes(key) &&
      !numberPropertyKeys.includes(key) &&
      !arrayPropertyKeys.includes(key) &&
      !objectPropertyKeys.includes(key) &&
      !customProperties.includes(key) &&
      !propertyKeysToExcludeFromComponentConfig.includes(key)
    );
  });

  const defaultDisplayedBooleanKeys = booleanPropertyKeys.slice(0, 3);
  const restOfBooleanKeys = booleanPropertyKeys.slice(3);

  const renderIcon = showOtherComponents ? (
    <ChevronUpIcon className={classes.upIcon} />
  ) : (
    <ChevronDownIcon className={classes.downIcon} />
  );
  const rendertext = showOtherComponents
    ? t('ux_editor.component_other_properties_hide_many_settings')
    : t('ux_editor.component_other_properties_show_many_settings');

  return (
    <>
      {layoutSet && component['layoutSet'] && (
        <RedirectToLayoutSet selectedSubform={component['layoutSet']} />
      )}
      {grid && (
        <>
          <Heading level={3} size='xxsmall'>
            {t('ux_editor.component_properties.grid')}
          </Heading>
          <EditGrid
            key={component.id}
            component={component}
            handleComponentChange={handleComponentUpdate}
          />
        </>
      )}
      {!hideUnsupported && (
        <Heading level={3} size='xxsmall'>
          {t('ux_editor.component_other_properties_title')}
        </Heading>
      )}

      {/** Boolean fields, incl. expression type */}
      {defaultDisplayedBooleanKeys.map((propertyKey) => (
        <EditBooleanValue
          component={component}
          handleComponentChange={handleComponentUpdate}
          propertyKey={propertyKey}
          defaultValue={properties[propertyKey].default}
          key={propertyKey}
        />
      ))}
      {showOtherComponents &&
        restOfBooleanKeys.map((propertyKey) => (
          <EditBooleanValue
            component={component}
            handleComponentChange={handleComponentUpdate}
            propertyKey={propertyKey}
            defaultValue={properties[propertyKey].default}
            key={propertyKey}
          />
        ))}
      {restOfBooleanKeys.length > 0 && (
        <StudioProperty.Button
          className={classes.button}
          icon={renderIcon}
          onClick={() => setShowOtherComponents((prev) => !prev)}
          property={rendertext}
        />
      )}

      {/** Custom logic for custom file endings */}
      {hasCustomFileEndings && (
        <>
          <EditBooleanValue
            propertyKey='hasCustomFileEndings'
            component={component}
            defaultValue={hasCustomFileEndings.default}
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
            />
          )}
        </>
      )}

      {/** String properties */}
      {stringPropertyKeys.map((propertyKey) => {
        return (
          <EditStringValue
            component={component}
            handleComponentChange={handleComponentUpdate}
            propertyKey={propertyKey}
            key={propertyKey}
            enumValues={properties[propertyKey]?.enum || properties[propertyKey]?.examples}
          />
        );
      })}

      {/** Number properties (number and integer types) */}
      {numberPropertyKeys.map((propertyKey) => {
        return (
          <EditNumberValue
            component={component}
            handleComponentChange={handleComponentUpdate}
            propertyKey={propertyKey}
            key={propertyKey}
            enumValues={properties[propertyKey]?.enum}
          />
        );
      })}

      {/** Array properties with enum values) */}
      {arrayPropertyKeys.map((propertyKey) => {
        return (
          <EditStringValue
            component={component}
            handleComponentChange={handleComponentUpdate}
            propertyKey={propertyKey}
            key={propertyKey}
            enumValues={properties[propertyKey]?.items?.enum}
            multiple={true}
          />
        );
      })}

      {/** Object properties */}
      {objectPropertyKeys.map((propertyKey) => {
        return (
          <Card key={propertyKey} className={classes.objectPropertyContainer}>
            <Heading level={3} size='xxsmall'>
              {componentPropertyLabel(propertyKey)}
            </Heading>
            {properties[propertyKey]?.description && (
              <Paragraph size='small'>
                {componentPropertyDescription(propertyKey) ?? properties[propertyKey].description}
              </Paragraph>
            )}
            <FormComponentConfig
              key={propertyKey}
              schema={properties[propertyKey]}
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
          </Card>
        );
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
