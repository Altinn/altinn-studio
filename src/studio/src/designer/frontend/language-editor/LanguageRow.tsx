import React, { useState } from 'react';

import { TextField } from '@altinn/altinn-design-system';
import { makeStyles } from '@material-ui/core';

type OnIdChangeProps = {
  oldValue: string;
  newValue: string;
};

interface ILanguageRowProps {
  translationKey: string;
  transformedLanguages: Record<string, string>;
  onIdChange: ({ oldValue, newValue }: OnIdChangeProps) => void;
}

export const LanguageRow = ({
  translationKey,
  onIdChange,
}: ILanguageRowProps) => {
  const classes = useStyles();
  const [idValue, setIdValue] = useState(translationKey);

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value;
    setIdValue(newValue);
  };

  const handleIdBlur = () => {
    onIdChange({ oldValue: translationKey, newValue: idValue });
  };

  return (
    <div className={classes.leftColBodyContainer}>
      <div className={classes.leftColFirstBox}>
        <div>
          <label htmlFor={translationKey}>ID</label>
        </div>
        <TextField value={idValue} type='text' onBlur={handleIdBlur} onChange={handleIdChange} />
      </div>
    </div>
  );
};

const useStyles = makeStyles({
  btn: {
    backgroundColor: '#17C96B',
    border: 'none',
    boxShadow: 'none',
    boxSizing: 'border-box',
    height: '36px',
    position: 'sticky',
    marginBottom: '29px',
    marginTop: '5rem',
    top: '177px',
    width: '100px',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    border: '2px dashed #ccc',
    height: '36px',
    width: '84px',
    active: {
      border: '2px dashed #000000',
    },
  },
  leftColBodyContainer: {
    display: 'grid',
    backgroundColor: '#FFF',
    height: '100%',
    columnGap: '10rem',
    gridTemplateColumns: '1fr 2fr',
    gridAutoRows: 'minmax(100px, auto)',
    marginTop: '2rem',
    width: '100%',
  },
  leftColFirstBox: {
     marginRight: '2rem', width: '246px'
  },
  lineBorder: {
    border: '1px solid #BCC7CC',
    marginTop: '2rem',
    top: '0px',
    width: '100%',
  },
  radioGroup: {
    width: '100%',
    display: 'flex',
    borderBottom: '1px solid #BCC7CC',
    marginBottom: '5px',
    padding: '1rem',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  rightColBodyContainer: {
    height: '100%',
    padding: '7rem',
    width: '100%',
  },
  stickyHeader: {
    borderBottom: '1px solid #BCC7CC',
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '1rem',
    position: 'sticky',
    marginBottom: '5rem',
    top: '0',
  },
});
