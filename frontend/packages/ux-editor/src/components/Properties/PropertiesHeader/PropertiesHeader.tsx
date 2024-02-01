import React from 'react';
import classes from './PropertiesHeader.module.css';
import { Divider, Heading, HelpText, Paragraph } from '@digdir/design-system-react';
import { formItemConfigs } from '../../../data/formItemConfig';
import { QuestionmarkDiamondIcon } from '@studio/icons';
import type { FormComponent } from '../../../types/FormComponent';
import { useItemTitle } from '../../../hooks/useItemTitle';
import { getComponentHelperTextByComponentType } from '../../../utils/language';
import { useTranslation } from 'react-i18next';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { useComponentSchemaQuery } from '../../../hooks/queries/useComponentSchemaQuery';
import { DataModelBindingRow } from './DataModelBindingRow';
import { KeyVerticalIcon } from '@studio/icons';

type PropertiesHeaderProps = {
  form: FormComponent;
  formId: string;
  handleComponentUpdate: (component: FormComponent) => void;
};

export const PropertiesHeader = ({
  form,
  formId,
  handleComponentUpdate,
}: PropertiesHeaderProps): React.JSX.Element => {
  const { t } = useTranslation();
  const itemTitle = useItemTitle();

  const isUnknownInternalComponent: boolean = !formItemConfigs[form.type];
  const Icon = isUnknownInternalComponent
    ? QuestionmarkDiamondIcon
    : formItemConfigs[form.type]?.icon;

  useLayoutSchemaQuery(); // Ensure we load the layout schemas so that component schemas can be loaded
  const { data: schema } = useComponentSchemaQuery(form.type);

  return (
    <div className={classes.wrapper}>
      <div className={classes.header}>
        <div className={classes.iconAndTextWrapper}>
          {Icon && <Icon />}
          <Heading size='xxsmall' level={2}>
            {itemTitle(form)}
          </Heading>
        </div>
        <HelpText size='medium' title='TODO'>
          {getComponentHelperTextByComponentType(form.type, t)}
        </HelpText>
      </div>
      <Divider className={classes.divider} />
      <div className={classes.content}>
        <div className={classes.contentRow}>
          {/* TODO - FIX Textfield / tekst komponent */}
          <KeyVerticalIcon />
          <Paragraph size='xsmall'>ID: {formId}</Paragraph>
        </div>
        <div className={classes.contentRow}>
          {schema && (
            // TODO - Change the design of the datamodel
            <DataModelBindingRow
              schema={schema}
              component={form}
              formId={formId}
              handleComponentUpdate={handleComponentUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
};
