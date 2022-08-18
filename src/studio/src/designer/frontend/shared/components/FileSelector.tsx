import React from 'react';
import { StyledComponentProps, makeStyles } from '@material-ui/core';
import { getLanguageFromKey } from '../utils/language';
import theme from '../theme/altinnStudioTheme';
import TopToolbarButton from "../../packages/schema-editor/src/components/TopToolbarButton";

export interface IFileSelectorProps extends StyledComponentProps {
  language: any;
  submitHandler: (file: FormData, fileName: string) => void;
  busy: boolean;
  labelTextResource: string;
  formFileName: string;
  accept?: string;
}

const useStyles = makeStyles({
  root: {
    '& button': {
      height: 36,
      borderBottom: `1px solid ${theme.altinnPalette.primary.blueDark}`,
      color: theme.altinnPalette.primary.white,
      background: theme.altinnPalette.primary.blueDark,
      textTransform: 'none',
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
    language,
    labelTextResource,
    accept,
    formFileName,
    busy,
    submitHandler,
  } = props;
  const classes = useStyles();
  const fileInput = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const file = fileInput?.current?.files?.item(0);
    if (file) {
      const formData = new FormData();
      formData.append(formFileName, file);
      submitHandler(formData, file.name);
    }
  };

  const handleInputChange = () => {
    const file = fileInput?.current?.files?.item(0);
    if (file) handleSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className={classes.root}>
      <input
        data-testid="FileSelector-input"
        type='file'
        id='file-upload-picker'
        className='sr-only'
        accept={accept}
        ref={fileInput}
        name={formFileName}
        onChange={handleInputChange}
        disabled={busy}
        tabIndex={-1}
      />
      <TopToolbarButton
        data-testid="upload-button"
        faIcon='fa fa-upload'
        iconSize={38}
        hideText={true}
        onClick={() => fileInput?.current?.click()}
      >
        {getLanguageFromKey(labelTextResource, language)}
      </TopToolbarButton>
    </form>
  );
}

export default FileSelector;
FileSelector.defaultProps = {
  accept: undefined,
};
