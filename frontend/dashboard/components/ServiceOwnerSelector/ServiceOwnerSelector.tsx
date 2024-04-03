import React, { useId } from 'react';
import { Label, NativeSelect } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import type { Organization } from 'app-shared/types/Organization';
import type { User } from 'app-shared/types/Repository';

type ServiceOwnerSelectorProps = {
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

  return (
    <div>
      <Label spacing htmlFor={serviceOwnerId}>
        {t('general.service_owner')}
      </Label>
      <NativeSelect hideLabel error={errorMessage} id={serviceOwnerId} name={name}>
        {selectableOptions.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
    </div>
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
