import { Description } from '@material-ui/icons';
import * as React from 'react';
import { Button, StyledComponentProps, makeStyles } from '@material-ui/core';
import classNames from 'classnames';
import { getLanguageFromKey } from '../utils/language';
import theme from '../theme/altinnStudioTheme';

interface IFileSelectorProps extends StyledComponentProps {
  language: any,
  submitHandler: (file: FormData, fileName: string) => void;
  busy: boolean;
  labelTextResource: string;
  formFileName: string;
  accept?: string;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    '&>*': { margin: 4, height: 36 },
    '& input:focus-visible + label': {
      outline: '2px solid black',
    },
    '& label': {
      flex: 1,
      display: 'inline-flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      '& span': {
        flex: 1,
        height: 36,
        padding: 2,
        paddingTop: 5,
        boxSizing: 'border-box',
        border: '1px solid #0062BA',
        '&.empty': {
          fontStyle: 'italic',
          color: 'grey',
        },
      },
    },
    '& button': {
      borderBottom: `1px solid ${theme.altinnPalette.primary.blueDark}`,
      color: theme.altinnPalette.primary.white,
      background: theme.altinnPalette.primary.blueDark,
      textTransform: 'none' as 'none',
      fontSize: 16,
      fontWeight: 400,
      borderRadius: '0',
      '&:hover': {
        background: theme.altinnPalette.primary.blueDarker,
        color: theme.altinnPalette.primary.white,
      },
      '&:focus': {
        background: theme.altinnPalette.primary.blueDarker,
        color: theme.altinnPalette.primary.white,
      },
      '&:disabled': {
        borderBottom: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
      },
    },
  },
});

function FileSelector(props: IFileSelectorProps) {
  const {
    language, labelTextResource, accept, formFileName, busy, submitHandler,
  } = props;
  const classes = useStyles();
  const fileInput = React.useRef<HTMLInputElement>();
  const [selectedFileName, setSelectedFileName] = React.useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const file = fileInput.current.files[0];
    const formData = new FormData();
    formData.append(formFileName, file);
    submitHandler(formData, file.name);
  };

  const handleInputChange = () => {
    setSelectedFileName(fileInput.current?.files[0]?.name);
  };

  return (
    <form onSubmit={handleSubmit} className={classes.root}>
      <input
        type='file'
        id='file-upload-picker'
        className='sr-only'
        accept={accept}
        ref={fileInput}
        name={formFileName}
        onChange={handleInputChange}
        disabled={busy}
      />
      <label htmlFor='file-upload-picker' title={getLanguageFromKey(labelTextResource, language)}>
        <Description fontSize='large' />
        <span
          className={classNames({ empty: !selectedFileName })}
        >
          {selectedFileName || getLanguageFromKey(labelTextResource, language)}
        </span>
      </label>
      <Button type='submit' disabled={!selectedFileName || busy}>
        {getLanguageFromKey('shared.submit_upload', language)}
      </Button>
    </form>
  );
}

export default FileSelector;
FileSelector.defaultProps = {
  accept: undefined,
};
