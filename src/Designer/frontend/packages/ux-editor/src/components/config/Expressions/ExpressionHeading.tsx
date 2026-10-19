import type { FormItem } from '../../../types/FormItem';
import type { FormItemProperty } from '../../../types/FormItemProperty';
import classes from './ExpressionHeading.module.css';
import { useComponentPropertyLabel } from '../../../hooks/useComponentPropertyLabel';

export type ExpressionHeadingProps = {
  formItem: FormItem;
  property: FormItemProperty;
};

export const ExpressionHeading = ({ formItem, property }: ExpressionHeadingProps) => {
  const propertyLabel = useComponentPropertyLabel();
  return (
    <>
      <span className={classes.textElement}>
        {propertyLabel(property.path.at(-1), property.definition)}
      </span>{' '}
      <span className={classes.componentName}>{formItem.id}</span>
    </>
  );
};
