import React, { useContext } from 'react';
import { Alert } from '@digdir/design-system-react';
import { ExpressionContent } from './ExpressionContent';
import { useText } from '../../../hooks';
import type { ExpressionProperty } from '../../../types/Expressions';
import { getExpressionPropertiesBasedOnComponentType } from '../../../types/Expressions';
import {
  addPropertyForExpression,
  getAllComponentPropertiesThatCanHaveExpressions,
  getNonOverlappingElementsFromTwoLists,
  getPropertiesWithExistingExpression,
} from '../../../utils/expressionsUtils';
import classes from './Expressions.module.css';
import type { LayoutItemType } from '../../../types/global';
import { FormContext } from '../../../containers/FormContext';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { Trans } from 'react-i18next';
import { NewExpressionButton } from './NewExpressionButton';

export const Expressions = () => {
  const { form } = useContext(FormContext);
  const availableProperties = getAllComponentPropertiesThatCanHaveExpressions(form);
  const propertiesFromComponentWithExpressions = getPropertiesWithExistingExpression(
    form,
    availableProperties,
  );
  const [propertiesWithExpressions, setPropertiesWithExpressions] = React.useState<
    ExpressionProperty[]
  >(propertiesFromComponentWithExpressions.length ? propertiesFromComponentWithExpressions : []);
  const [newlyAddedProperty, setNewlyAddedProperty] = React.useState<ExpressionProperty>(undefined);
  const t = useText();
  const expressionProperties = getExpressionPropertiesBasedOnComponentType(
    form.itemType as LayoutItemType,
  );
  const isExpressionLimitReached =
    propertiesWithExpressions?.length >= expressionProperties?.length;

  const addNewExpression = (property: ExpressionProperty) => {
    const newProperties = addPropertyForExpression(propertiesWithExpressions, property);
    setPropertiesWithExpressions(newProperties);
    setNewlyAddedProperty(newProperties.at(newProperties.length - 1));
  };

  const handleDeleteExpression = (propertyToDelete: ExpressionProperty) => {
    const updatedProperties = propertiesWithExpressions.filter(
      (property) => property !== propertyToDelete,
    );
    setPropertiesWithExpressions(updatedProperties);
  };

  const getAvailableProperties = (): ExpressionProperty[] => {
    return getNonOverlappingElementsFromTwoLists(expressionProperties, propertiesWithExpressions);
  };

  return (
    <div className={classes.root}>
      <Trans i18nKey={'right_menu.read_more_about_expressions'}>
        <a
          href={altinnDocsUrl('altinn-studio/designer/build-app/expressions')}
          target='_newTab'
          rel='noopener noreferrer'
        />
      </Trans>
      {Object.values(propertiesWithExpressions).map((property: ExpressionProperty) => (
        <ExpressionContent
          key={property}
          property={property}
          defaultEditMode={property === newlyAddedProperty}
          onDeleteExpression={handleDeleteExpression}
        />
      ))}
      {isExpressionLimitReached ? (
        <Alert className={classes.expressionsAlert}>
          {t('right_menu.expressions_expressions_limit_reached_alert')}
        </Alert>
      ) : (
        <>
          {propertiesWithExpressions.length === 0 && (
            <p>
              <Trans
                i18nKey={'right_menu.expressions_property_on_component'}
                values={{ componentName: form.id }}
                components={{ bold: <strong /> }}
              />
            </p>
          )}
          <NewExpressionButton
            options={getAvailableProperties()}
            onAddExpression={(property: ExpressionProperty) => addNewExpression(property)}
          />
        </>
      )}
    </div>
  );
};
