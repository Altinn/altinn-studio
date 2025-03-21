import React, { useContext } from 'react';
import { Paragraph, Link } from '@digdir/designsystemet-react';
import { ExpressionContent } from '../ExpressionContent';
import classes from './Expressions.module.css';
import { FormItemContext } from '../../../containers/FormItemContext';
import { altinnDocsUrl } from 'app-shared/ext-urls';
import { Trans } from 'react-i18next';
import { NewExpressionButton } from './NewExpressionButton';
import {
  getDefinedExpressionProperties,
  getPropertyValue,
  removeExpressionFromFormItem,
  setExpressionOnFormItem,
} from './utils';
import type { FormItemProperty } from '../../../types/FormItemProperty';
import { ExpressionHeading } from './ExpressionHeading';
import type { FormItem } from '../../../types/FormItem';
import type { BooleanExpression } from '@studio/components-legacy';
import { StudioCodeFragment } from '@studio/components-legacy';
import { useText } from '../../../hooks';

export const Expressions = () => {
  const { formItem, handleUpdate, debounceSave } = useContext(FormItemContext);

  const updateAndSave = async (newFormItem: FormItem) => {
    handleUpdate(newFormItem);
    await debounceSave(); // Todo: Make the function synchronous: https://github.com/Altinn/altinn-studio/issues/12383
  };

  const handleExpressionChange = (property: FormItemProperty, newExpression: BooleanExpression) => {
    const newFormItem = setExpressionOnFormItem(formItem, property, newExpression);
    updateAndSave(newFormItem);
  };

  const handleDeleteExpression = (property: FormItemProperty) => {
    const newFormItem = removeExpressionFromFormItem(formItem, property);
    updateAndSave(newFormItem);
  };

  const propertiesWithExpressions = getDefinedExpressionProperties(formItem);

  return (
    <div className={classes.root}>
      <ReadMoreLink />
      {!propertiesWithExpressions.length && <Placeholder componentName={formItem.id} />}
      {Object.values(propertiesWithExpressions).map((property) => (
        <ExpressionContent
          expression={getPropertyValue(formItem, property)}
          heading={<ExpressionHeading formItem={formItem} property={property} />}
          key={JSON.stringify(property)}
          onChange={(expression) => handleExpressionChange(property, expression)}
          onDelete={() => handleDeleteExpression(property)}
        />
      ))}
      <NewExpressionButton />
    </div>
  );
};

const ReadMoreLink = () => {
  const t = useText();
  return (
    <Link href={altinnDocsUrl({ relativeUrl: 'altinn-studio/designer/build-app/expressions' })}>
      {t('right_menu.read_more_about_expressions')}
    </Link>
  );
};

const Placeholder = ({ componentName }: { componentName: string }) => (
  <Paragraph size='small' className={classes.placeHolder}>
    <Trans
      i18nKey={'right_menu.expressions_property_on_component'}
      values={{ componentName }}
      components={{
        bold: <StudioCodeFragment className={classes.wrapper} title={componentName} />,
      }}
    />
  </Paragraph>
);
