import React from 'react';
import classes from './PropertiesHeader.module.css';
import { Divider, Heading, HelpText } from '@digdir/design-system-react';
import { formItemConfigs } from '../../../data/formItemConfig';
import { QuestionmarkDiamondIcon } from '@studio/icons';
import { getComponentHelperTextByComponentType } from '../../../utils/language';
import { useTranslation } from 'react-i18next';
import { useComponentSchemaQuery } from '../../../hooks/queries/useComponentSchemaQuery';
import { DataModelBindingRow } from './DataModelBindingRow';
import { EditComponentIdRow } from './EditComponentIdRow';
import type { FormItem } from '../../../types/FormItem';
import {isContainer} from "../../../utils/formItemUtils";
import {EditGroupDataModelBindings} from "../../config/group/EditGroupDataModelBindings";

export type PropertiesHeaderProps = {
  form: FormItem;
  formId: string;
  handleComponentUpdate: (component: FormItem) => void;
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

  const { data: schema } = useComponentSchemaQuery(form.type);

  const handleDataModelGroupChange = (dataBindingName: string, key: string) => {
    handleComponentUpdate({
      ...form,
      dataModelBindings: {
        [key]: dataBindingName,
      },
    });
  };

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
        {schema && (isContainer(form) ? (
            <EditGroupDataModelBindings
                dataModelBindings={form.dataModelBindings}
                onDataModelChange={handleDataModelGroupChange}
            />
        ) : (
            <div className={classes.contentRow}>
            <DataModelBindingRow
              schema={schema}
              component={form as FormComponent}
              formId={formId}
              handleComponentUpdate={handleComponentUpdate}
            />
          </div>
        ))}
      </div>
    </>
  );
};
