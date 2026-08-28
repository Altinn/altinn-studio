import type { UpdateFormMutateOptions } from '../../containers/FormItemContext';
import { RedirectToLayoutSet } from './editModal/RedirectToLayoutSet';
import { usePropertyTypes } from './ConfigProperties/usePropertyTypes';
import {
  ConfigGridProperties,
  ConfigBooleanProperties,
  ConfigArrayProperties,
  ConfigStringProperties,
  ConfigNumberProperties,
} from './ConfigProperties';
import type { FormItem } from '../../types/FormItem';
import classes from './FormComponentConfig.module.css';
import type { PropertyDefinition } from '@app/layout-contract';
import { ConfigObjectProperty } from './ConfigProperties/ConfigObjectProperty/ConfigObjectProperty';
import { getSpecializedPropertyPaths } from '../../data/componentEditorRegistry';

export interface IEditFormComponentProps {
  editFormId: string;
  component: FormItem;
  handleComponentUpdate: (component: FormItem, mutateOptions?: UpdateFormMutateOptions) => void;
  keepEditOpen?: boolean;
}

export interface FormComponentConfigProps extends IEditFormComponentProps {
  properties: Readonly<Record<string, PropertyDefinition>>;
  propertyPath?: readonly string[];
  specializedPropertyPaths?: readonly string[];
}

export const FormComponentConfig = ({
  properties,
  editFormId,
  component,
  handleComponentUpdate,
  keepEditOpen,
  propertyPath = [],
  specializedPropertyPaths = getSpecializedPropertyPaths(component.type),
}: FormComponentConfigProps) => {
  const pathPrefix = propertyPath.length ? `${propertyPath.join('.')}.` : '';
  const specializedProperties = specializedPropertyPaths
    .filter((path) => path.startsWith(pathPrefix) && !path.slice(pathPrefix.length).includes('.'))
    .map((path) => path.slice(pathPrefix.length));

  const { booleanKeys, stringKeys, numberKeys, arrayKeys, objectKeys } = usePropertyTypes(
    properties,
    specializedProperties,
  );

  const { layoutSet } = properties;

  return (
    <>
      {/** LayoutSet Property */}
      {/** Redirect to layout set if the component has a layoutSet property */}
      {layoutSet && component['layoutSet'] && (
        <RedirectToLayoutSet selectedSubform={component['layoutSet']} />
      )}
      {/** Boolean fields, incl. expression type */}
      {booleanKeys.length > 0 && (
        <ConfigBooleanProperties
          booleanPropertyKeys={booleanKeys}
          properties={properties}
          component={component}
          handleComponentUpdate={handleComponentUpdate}
          className={classes.elementWrapper}
        />
      )}

      {/** Grid Property */}
      {properties?.grid && (
        <ConfigGridProperties
          component={component}
          handleComponentUpdate={handleComponentUpdate}
          className={classes.elementWrapper}
        />
      )}

      {/** String properties */}
      {stringKeys.length > 0 && (
        <ConfigStringProperties
          stringPropertyKeys={stringKeys}
          properties={properties}
          component={component}
          handleComponentUpdate={handleComponentUpdate}
          className={classes.elementWrapper}
          keepEditOpen={keepEditOpen}
        />
      )}

      {/** Number properties */}
      {numberKeys.length > 0 && (
        <ConfigNumberProperties
          numberPropertyKeys={numberKeys}
          properties={properties}
          component={component}
          handleComponentUpdate={handleComponentUpdate}
          className={classes.elementWrapper}
          keepEditOpen={keepEditOpen}
        />
      )}

      {/** Array properties with enum values) */}
      {arrayKeys.length > 0 && (
        <ConfigArrayProperties
          arrayPropertyKeys={arrayKeys}
          properties={properties}
          component={component}
          handleComponentUpdate={handleComponentUpdate}
          className={classes.elementWrapper}
          keepEditOpen={keepEditOpen}
        />
      )}

      {/** Object properties  */}
      {objectKeys.length > 0 &&
        objectKeys.map((objectPropertyKey) => {
          return (
            <ConfigObjectProperty
              key={objectPropertyKey}
              editFormId={editFormId}
              objectPropertyKey={objectPropertyKey}
              properties={properties}
              component={component}
              handleComponentUpdate={handleComponentUpdate}
              className={classes.elementWrapper}
              propertyPath={propertyPath}
              specializedPropertyPaths={specializedPropertyPaths}
            />
          );
        })}
    </>
  );
};
