import * as React from 'react';

import AltinnInputField from 'app-shared/components/AltinnInputField';
import AltinnPopper from 'app-shared/components/AltinnPopper';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useAppSelector } from 'app/hooks';

const zIndex = {
  zIndex: 1300,
};

type RepoNameInputProps = {
  repoName: string;
  errorMessage?: string;
  onRepoNameChanged: (newValue: string) => void;
};

export const RepoNameInput = ({
  repoName,
  onRepoNameChanged,
  errorMessage,
}: RepoNameInputProps) => {
  const language = useAppSelector((state) => state.language.language);
  const serviceNameRef = React.useRef(null);

  React.useLayoutEffect(() => {
    serviceNameRef.current = document.querySelector('#service-saved-name');
  });

  const handleChange = ({ target }: { target: HTMLInputElement }) => {
    onRepoNameChanged(target.value);
  };
  return (
    <div>
      <AltinnInputField
        id='service-saved-name'
        inputHeader={getLanguageFromKey('general.service_name', language)}
        inputDescription={getLanguageFromKey(
          'dashboard.service_saved_name_description',
          language,
        )}
        inputValue={repoName}
        onChangeFunction={handleChange}
        fullWidth={true}
      />
      {errorMessage && (
        <AltinnPopper
          anchorEl={serviceNameRef.current}
          message={errorMessage}
          styleObj={zIndex}
        />
      )}
    </div>
  );
};
