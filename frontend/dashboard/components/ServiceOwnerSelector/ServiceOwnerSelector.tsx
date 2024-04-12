import React, { useId, useState } from 'react';
import { Combobox } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';

export type ServiceOwnerSelectorProps = {
  selectedOrgOrUser: string;
  user: User;
  organizations: Organization[];
  errorMessage?: string;
  name?: string;
};

export const ServiceOwnerSelector = ({
  selectedOrgOrUser,
  user,
  organizations,
  errorMessage,
  name,
}: ServiceOwnerSelectorProps) => {
  const { t } = useTranslation();
  const serviceOwnerId: string = useId();

  const selectableUser: SelectableItem = mapUserToSelectableItem(user);
  const selectableOrganizations: SelectableItem[] = mapOrganizationToSelectableItems(organizations);
  const selectableOptions: SelectableItem[] = [selectableUser, ...selectableOrganizations];

  const defaultValue: string =
    selectableOptions.find((item) => item.value === selectedOrgOrUser)?.value ??
    selectableUser.value;

  const [selectedValue, setSelectedValue] = useState<string[]>([defaultValue]);

  return (
    <Combobox
      label={t('general.service_owner')}
      error={errorMessage}
      size='small'
      name={name}
      id={serviceOwnerId}
      // Below is temporary until we get the 'initialValue' prop from Designsystemet
      value={selectedValue}
      onValueChange={(newValue: string[]) => setSelectedValue(newValue)}
    >
      {selectableOptions.map(({ value, label }) => (
        <Combobox.Option key={value} value={value}>
          {label}
        </Combobox.Option>
      ))}
    </Combobox>
  );
};

type SelectableItem = {
  value: string;
  label: string;
};
const mapOrganizationToSelectableItems = (organizations: Organization[]): SelectableItem[] => {
  return organizations.map(
    ({ username, full_name }): SelectableItem => ({
      value: username,
      label: full_name || username,
    }),
  );
};

const mapUserToSelectableItem = (user: User): SelectableItem => {
  return {
    value: user.login,
    label: user.full_name || user.login,
  };
};
