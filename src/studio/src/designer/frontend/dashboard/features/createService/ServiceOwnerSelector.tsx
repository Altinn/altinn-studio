import * as React from 'react';

import {
  User,
  Organisations,
} from '../../resources/fetchDashboardResources/dashboardSlice';

import AltinnDropdown from 'app-shared/components/AltinnDropdown';
import AltinnPopper from 'app-shared/components/AltinnPopper';
import { getLanguageFromKey } from 'app-shared/utils/language';

import { useAppSelector } from 'app/hooks';

const zIndex = {
  zIndex: 1300,
};

type ServiceOwnerSelectorProps = {
  onServiceOwnerChanged: (newValue: string) => void;
  errorMessage?: string;
  selectedOrgOrUser: string;
};

type CombineCurrentUserAndOrg = {
  user: User;
  organisations: Organisations;
};

const combineCurrentUserAndOrg = ({
  organisations,
  user,
}: CombineCurrentUserAndOrg) => {
  const allUsers = organisations.map((props: any) => {
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
export const ServiceOwnerSelector = ({
  onServiceOwnerChanged,
  errorMessage,
  selectedOrgOrUser,
}: ServiceOwnerSelectorProps) => {
  const organisations = useAppSelector(
    (state) => state.dashboard.organisations,
  );
  const user = useAppSelector((state) => state.dashboard.user);
  const language = useAppSelector((state) => state.language.language);

  const serviceOwnerRef = React.useRef(null);

  const selectableOrgsOrUser = React.useMemo(() => {
    return combineCurrentUserAndOrg({
      organisations,
      user,
    });
  }, [organisations, user]);

  React.useEffect(() => {
    if (selectableOrgsOrUser.length === 1) {
      onServiceOwnerChanged(selectableOrgsOrUser[0].value); // auto-select the option when theres only 1 option
    } else if (selectableOrgsOrUser.length > 1) {
      onServiceOwnerChanged(''); // reset selection to '' when there are more than 1 option loaded
    }
  }, [selectableOrgsOrUser, onServiceOwnerChanged]);

  React.useLayoutEffect(() => {
    serviceOwnerRef.current = document.querySelector('#service-owner');
  });

  const handleChange = ({ target }: { target: HTMLInputElement }) => {
    onServiceOwnerChanged(target.value);
  };

  return (
    <div>
      <AltinnDropdown
        id='service-owner'
        inputHeader={getLanguageFromKey('general.service_owner', language)}
        inputDescription={getLanguageFromKey(
          'dashboard.service_owner_description',
          language,
        )}
        handleChange={handleChange}
        dropdownItems={selectableOrgsOrUser}
        selectedValue={selectedOrgOrUser}
        disabled={selectableOrgsOrUser.length === 1}
      />
      {errorMessage && (
        <AltinnPopper
          anchorEl={serviceOwnerRef.current}
          message={errorMessage}
          styleObj={zIndex}
        />
      )}
    </div>
  );
};
