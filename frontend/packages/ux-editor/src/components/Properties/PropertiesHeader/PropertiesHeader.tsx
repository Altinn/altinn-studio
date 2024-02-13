import React from 'react';
import classes from './PropertiesHeader.module.css';
import { Divider, Heading, HelpText } from '@digdir/design-system-react';
import { formItemConfigs } from '../../../data/formItemConfig';
import { QuestionmarkDiamondIcon } from '@studio/icons';
import type { FormComponent } from '../../../types/FormComponent';
import { getComponentHelperTextByComponentType } from '../../../utils/language';
import { useTranslation } from 'react-i18next';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { useComponentSchemaQuery } from '../../../hooks/queries/useComponentSchemaQuery';
import { DataModelBindingRow } from './DataModelBindingRow';
import { EditComponentIdRow } from './EditComponentIdRow';

export type PropertiesHeaderProps = {
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

  const isUnknownInternalComponent: boolean = !formItemConfigs[form.type];
  const Icon = isUnknownInternalComponent
    ? QuestionmarkDiamondIcon
    : formItemConfigs[form.type]?.icon;

  useLayoutSchemaQuery(); // Ensure we load the layout schemas so that component schemas can be loaded
  const { data: schema } = useComponentSchemaQuery(form.type);

  return (
    <>
      <div className={classes.header}>
        <div className={classes.iconAndTextWrapper}>
          {Icon && <Icon />}
          <Heading size='xxsmall' level={2}>
            {t(`ux_editor.component_title.${form.type}`)}
          </Heading>
        </div>
        <HelpText size='medium' title={t('ux_editor.component_help_text_general_title')}>
          {getComponentHelperTextByComponentType(form.type, t)}
        </HelpText>
      </div>
      <Divider className={classes.divider} />
      <div className={classes.content}>
        <div className={classes.contentRow}>
          <EditComponentIdRow component={form} handleComponentUpdate={handleComponentUpdate} />
        </div>
        {schema && (
          <div className={classes.contentRow}>
            <DataModelBindingRow
              schema={schema}
              component={form}
              formId={formId}
              handleComponentUpdate={handleComponentUpdate}
            />
          </div>
        )}
      </div>
    </>
  );
};
