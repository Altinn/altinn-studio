import React from 'react';
import classes from './PropertiesHeader.module.css';
import { Divider, Heading, HelpText } from '@digdir/design-system-react';
import { formItemConfigs } from '../../../data/formItemConfig';
import { QuestionmarkDiamondIcon } from '@studio/icons';
import type { FormComponent } from '../../../types/FormComponent';
import type { FormContainer } from '../../../types/FormContainer';
import { useItemTitle } from '../../../hooks/useItemTitle';
import { getComponentHelperTextByComponentType } from '../../../utils/language';
import { useTranslation } from 'react-i18next';
import { EditDataModelBindings } from '../../config/editModal/EditDataModelBindings';

type PropertiesHeaderProps = {
  form: FormContainer | FormComponent;
  schema: any;
};

export const PropertiesHeader = ({ form, schema }: PropertiesHeaderProps): React.JSX.Element => {
  const { t } = useTranslation();
  const itemTitle = useItemTitle();

  const isUnknownInternalComponent: boolean = !formItemConfigs[form.type];
  const Icon = isUnknownInternalComponent
    ? QuestionmarkDiamondIcon
    : formItemConfigs[form.type]?.icon;

  const { dataModelBindings } = schema.properties;

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
          <p>icon</p>
        </div>
        <div className={classes.contentRow}>
          {dataModelBindings?.properties && (
            <>
              <Heading level={3} size='xxsmall'>
                {t('top_menu.datamodel')}
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
        </div>
      </div>
    </div>
  );
};
