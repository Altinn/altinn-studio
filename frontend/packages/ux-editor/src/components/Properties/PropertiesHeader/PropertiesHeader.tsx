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

type PropertiesHeaderProps = {
  form: FormContainer | FormComponent;
};

export const PropertiesHeader = ({ form }: PropertiesHeaderProps): React.JSX.Element => {
  const { t } = useTranslation();
  const itemTitle = useItemTitle();

  const isUnknownInternalComponent: boolean = !formItemConfigs[form.type];
  const Icon = isUnknownInternalComponent
    ? QuestionmarkDiamondIcon
    : formItemConfigs[form.type]?.icon;

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
        <div className={classes.contentRow}></div>
      </div>
    </div>
  );
};
