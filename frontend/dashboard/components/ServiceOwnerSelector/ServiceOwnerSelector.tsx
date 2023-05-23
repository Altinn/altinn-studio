import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { AltinnPopper } from 'app-shared/components/AltinnPopper';
import { Select } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { Organization } from 'app-shared/types/Organization';
import { User } from 'app-shared/types/User';

const zIndex = {
  zIndex: 1300,
};

interface ICombineCurrentUserAndOrg {
  user: User;
  organizations: Organization[];
}

const combineCurrentUserAndOrg = ({ organizations = [], user }: ICombineCurrentUserAndOrg) => {
  const allUsers = organizations.map((props: any) => {
    return {
      value: props.username,
      label: props.full_name || props.username,
    };
  });

  allUsers.push({
    value: user.login,
    label: user.full_name || user.login,
  });

  return allUsers;
};

interface ServiceOwnerSelectorProps {
  selectedOrgOrUser: string;
  user: User;
  organizations: Organization[];
  errorMessage?: string;
  onServiceOwnerChanged: (newValue: string) => void;
}

export const ServiceOwnerSelector = ({
  selectedOrgOrUser,
  user,
  organizations,
  errorMessage,
  onServiceOwnerChanged,
}: ServiceOwnerSelectorProps) => {
  const { t } = useTranslation();

  const serviceOwnerRef = useRef(null);

  const selectableOrgsOrUser = useMemo(() => {
    return combineCurrentUserAndOrg({
      organizations,
      user,
    });
  }, [organizations, user]);

  useEffect(() => {
    if (selectableOrgsOrUser.length === 1) {
      onServiceOwnerChanged(selectableOrgsOrUser[0].value); // auto-select the option when theres only 1 option
    }
  }, [selectableOrgsOrUser, onServiceOwnerChanged]);

  useLayoutEffect(() => {
    serviceOwnerRef.current = document.querySelector('#service-owner');
  });

  const handleChange = (value: string) => onServiceOwnerChanged(value);
  const value =
    selectableOrgsOrUser.length === 1 ? selectableOrgsOrUser[0].value : selectedOrgOrUser;

  return (
    <div>
      <Select
        inputId='service-owner'
        label={t('general.service_owner')}
        onChange={handleChange}
        options={selectableOrgsOrUser}
        value={value}
        disabled={selectableOrgsOrUser.length === 1}
      />
      {errorMessage && (
        <AltinnPopper anchorEl={serviceOwnerRef.current} message={errorMessage} styleObj={zIndex} />
      )}
    </div>
  );
};
