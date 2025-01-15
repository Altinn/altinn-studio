import React, { useId } from 'react';
import { NativeSelect } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';

export type ServiceOwnerSelectorProps = {
  selectedOrgOrUser: string;
  user: User;
  organizations: Organization[];
  errorMessage?: string;
  name?: string;
  onChange?: (org: string) => void;
};

export const ServiceOwnerSelector = ({
  selectedOrgOrUser,
  user,
  organizations,
  errorMessage,
  name,
  onChange,
}: ServiceOwnerSelectorProps) => {
  const { t } = useTranslation();
  const serviceOwnerId: string = useId();

  const selectableUser: SelectableItem = mapUserToSelectableItem(user);
  const selectableOrganizations: SelectableItem[] = mapOrganizationToSelectableItems(organizations);
  const selectableOptions: SelectableItem[] = [selectableUser, ...selectableOrganizations];

  const defaultValue: string =
    selectableOptions.find((item) => item.value === selectedOrgOrUser)?.value ??
    selectableUser.value;

  return (
    <NativeSelect
      label={t('general.service_owner')}
      error={errorMessage}
      size='small'
      name={name}
      id={serviceOwnerId}
      defaultValue={defaultValue}
      onChange={(event) => onChange(event.target.value)}
    >
      {selectableOptions.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </NativeSelect>
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
