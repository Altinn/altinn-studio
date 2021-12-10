import * as React from 'react';

import { makeStyles } from '@material-ui/core';
import AltinnInformationPaper from 'app-shared/components/AltinnInformationPaper';
import AltinnInputField from 'app-shared/components/AltinnInputField';
import AltinnPopper from 'app-shared/components/AltinnPopper';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useAppSelector } from 'common/hooks';

const zIndex = {
  zIndex: 1300,
};

type RepoNameInputProps = {
  repoName: string;
  errorMessage?: string;
  onRepoNameChanged: (newValue: string) => void;
};

const useStyles = makeStyles({
  strong: {
    'font-weight': '500',
  },
});

export const RepoNameInput = ({
  repoName,
  onRepoNameChanged,
  errorMessage,
}: RepoNameInputProps) => {
  const classes = useStyles();
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
        inputValue={repoName}
        onChangeFunction={handleChange}
        fullWidth={true}
      />
      <div style={{ margin: '12px 0 0 0' }}>
        <AltinnInformationPaper>
          <>
            {getLanguageFromKey(
              'dashboard.service_saved_name_description',
              language,
            )}{' '}
            <strong className={classes.strong}>
              {getLanguageFromKey(
                'dashboard.service_saved_name_description_cannot_be_changed',
                language,
              )}
            </strong>
          </>
        </AltinnInformationPaper>
      </div>
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
