import React from 'react';
import { Alert, Heading } from '@digdir/designsystemet-react';
import type { UpdateFormMutateOptions } from '../../containers/FormItemContext';
import { RedirectToLayoutSet } from './editModal/RedirectToLayoutSet';
import {} from './ConfigProperties/ConfigNumberProperties';
import { usePropertyTypes } from './ConfigProperties/usePropertyTypes';
import {
  ConfigGridProperties,
  ConfigBooleanProperties,
  ConfigObjectProperties,
  ConfigArrayProperties,
  ConfigStringProperties,
  ConfigNumberProperties,
} from './ConfigProperties';
import { useText } from '../../hooks';
import type { FormItem } from '../../types/FormItem';

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

  const { booleanKeys, stringKeys, numberKeys, arrayKeys, objectKeys, unsupportedKeys } =
    usePropertyTypes(schema, customProperties);

  if (!schema?.properties) return null;

  const { properties } = schema;
  const { layoutSet } = properties;

  return (
    <>
      {/** LayoutSet Property */}
      {/** Redirect to layout set if the component has a layoutSet property */}
      {layoutSet && component['layoutSet'] && (
        <RedirectToLayoutSet selectedSubform={component['layoutSet']} />
      )}
      {!hideUnsupported && (
        <Heading level={3} size='xxsmall'>
          {t('ux_editor.component_other_properties_title')}
        </Heading>
      )}

      {/** Boolean fields, incl. expression type */}
      {booleanKeys.length && (
        <ConfigBooleanProperties
          booleanPropertyKeys={booleanKeys}
          schema={schema}
          component={component}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}

      {/** Grid Property */}
      {properties?.grid && (
        <ConfigGridProperties component={component} handleComponentUpdate={handleComponentUpdate} />
      )}

      {/** String properties */}
      {stringKeys.length && (
        <ConfigStringProperties
          stringPropertyKeys={stringKeys}
          schema={schema}
          component={component}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}

      {/** Number properties */}
      {numberKeys.length > 0 && (
        <ConfigNumberProperties
          numberPropertyKeys={numberKeys}
          schema={schema}
          component={component}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}

      {/** Array properties with enum values) */}
      {arrayKeys.length > 0 && (
        <ConfigArrayProperties
          arrayPropertyKeys={arrayKeys}
          schema={schema}
          component={component}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}

      {/** Object properties  */}
      {objectKeys.length && (
        <ConfigObjectProperties
          editFormId={editFormId}
          objectPropertyKeys={objectKeys}
          schema={schema}
          component={component}
          handleComponentUpdate={handleComponentUpdate}
        />
      )}

      {/* Show information about unsupported properties if there are any */}
      {unsupportedKeys.length > 0 && !hideUnsupported && (
        <Alert severity='info'>
          {t('ux_editor.edit_component.unsupported_properties_message')}
          <ul>
            {unsupportedKeys.map((propertyKey) => (
              <li key={propertyKey}>{propertyKey}</li>
            ))}
          </ul>
        </Alert>
      )}
    </>
  );
};
