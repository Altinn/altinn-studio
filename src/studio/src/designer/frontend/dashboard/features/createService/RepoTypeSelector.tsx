import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';

import AltinnInformationPaper from 'app-shared/components/AltinnInformationPaper';
import { AltinnRadioGroup } from 'app-shared/components/AltinnRadioGroup';
import { AltinnRadio } from 'app-shared/components/AltinnRadio';
import { getLanguageFromKey } from 'app-shared/utils/language';

import { useAppSelector } from 'common/hooks';
import { DataModellingFormat } from 'services/repoApi';

type RepoTypeSelectorProps = {
  selectedFormat: DataModellingFormat;
  onFormatChange: (newFormat: DataModellingFormat) => void;
};

const useStyles = makeStyles({
  radioGroup: {
    marginTop: '-2rem',
  },
  paragraph: {
    marginTop: '0',
  },
  paperWrapper: {
    margin: '12px 0 0 0',
  },
});

export const RepoTypeSelector = ({
  selectedFormat,
  onFormatChange,
}: RepoTypeSelectorProps) => {
  const classes = useStyles();
  const language = useAppSelector((state) => state.language.language);

  const handleChange = ({ target }: { target: HTMLInputElement }) => {
    onFormatChange(target.value as DataModellingFormat);
  };

  return (
    <div>
      <Typography variant='h2'>
        {getLanguageFromKey('dashboard.select_datamodelling_format', language)}
      </Typography>
      <AltinnRadioGroup
        value={selectedFormat}
        onChange={handleChange}
        className={classes.radioGroup}
      >
        <AltinnRadio
          label={getLanguageFromKey(
            'dashboard.datamodelling_format_json',
            language,
          )}
          value={DataModellingFormat.JSON}
        />
        <AltinnRadio
          label={getLanguageFromKey(
            'dashboard.datamodelling_format_xsd',
            language,
          )}
          value={DataModellingFormat.XSD}
        />
      </AltinnRadioGroup>
      <div className={classes.paperWrapper}>
        <AltinnInformationPaper>
          <>
            <p className={classes.paragraph}>
              {getLanguageFromKey(
                'dashboard.datamodelling_description_json',
                language,
              )}
            </p>
            <p className={classes.paragraph}>
              {getLanguageFromKey(
                'dashboard.datamodelling_description_xsd',
                language,
              )}
            </p>
            <a href='https://docs.altinn.studio/'>
              {getLanguageFromKey(
                'dashboard.datamodelling_description_read_more',
                language,
              )}
            </a>
          </>
        </AltinnInformationPaper>
      </div>
    </div>
  );
};
