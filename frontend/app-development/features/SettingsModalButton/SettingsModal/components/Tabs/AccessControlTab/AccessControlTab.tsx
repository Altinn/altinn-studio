import React, { ReactNode } from 'react';
import classes from './AccessControlTab.module.css';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';
import { Checkbox, Paragraph } from '@digdir/design-system-react';

type AccessControlOption = 'BankruptcyEstate' | 'Business' | 'PrivatePerson' | 'Subunit';

const accessControlOptionsMap: Record<AccessControlOption, string> = {
  BankruptcyEstate: 'settings_modal.access_control_tab_option_bankruptcy_estate',
  Business: 'settings_modal.access_control_tab_option_business',
  PrivatePerson: 'settings_modal.access_control_tab_option_private_person',
  Subunit: 'settings_modal.access_control_tab_option_subunit',
};

export type AccessControlTabProps = {};

export const AccessControlTab = ({}: AccessControlTabProps): ReactNode => {
  const { t } = useTranslation();

  const accessControlOptions = Object.keys(accessControlOptionsMap).map((key) => ({
    value: key,
    label: accessControlOptionsMap[key],
  }));

  const displayCheckboxes = () => {
    return accessControlOptions.map((option) => (
      <Checkbox value={option.value} key={option.value} size='small'>
        {t(option.label)}
      </Checkbox>
    ));
  };

  const handleChange = (value: string[]) => {
    console.log(value);
  };

  return (
    <div>
      <TabHeader text={t('settings_modal.access_control_tab_heading')} />
      <Checkbox.Group
        legend={t('settings_modal.access_control_tab_checkbox_legend')}
        onChange={handleChange}
        // onBlur={} // TODO - save
        // value={} // TODO
      >
        <Paragraph as='span' size='small' short className={classes.checkboxParagraph}>
          {t('settings_modal.access_control_tab_checkbox_description')}
        </Paragraph>
        {displayCheckboxes()}
      </Checkbox.Group>
    </div>
  );
};
