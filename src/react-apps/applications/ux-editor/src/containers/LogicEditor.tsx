import {Button, Grid, MenuItem, Select} from '@material-ui/core';
import { createStyles, withStyles } from '@material-ui/core/styles';
import classNames = require('classnames');
import * as React from 'react';
import CodeEditor from '../../../shared/src/code-editor/codeEditor';

// import theme from '../../../shared/src/theme/altinnStudioTheme';

// const altinnTheme = theme;

const languages: ICodeLanguage = {
  cs: {
    name: 'csharp',
    displayName: 'C#',
  },
  js: {
    name: 'javascript',
    displayName: 'Javascript',
  },
  ts: {
    name: 'typescript',
    displayName: 'Typescript',
  },
  json: {
    name: 'json',
    displayName: 'JSON',
  },
  css: {
    name: 'css',
    displayName: 'CSS',
  },
};

export interface ILogicEditorProvidedProps {
  classes: any;
  folder: string;
  selectedFileName: string;
  availableFiles: string[];
  onSwitchFile?: (fileName: string) => void;
  closeLogicEditor?: () => void;
}

const styles = createStyles({
  fileHeader: {
    borderBottom: '1px solid #C9C9C9',
    marginBottom: '1.6rem',
    paddingTop: '1rem',
    paddingBottom: '1.3rem',
  },
  codeEditorContent: {
    minHeight: '50vh',
  },
  selectFile: {
    borderBottom: '1px solid blue',
    fontSize: '1.6rem',
  },
});

class LogicEditor extends React.Component<ILogicEditorProvidedProps, any> {

  public getFolderText(): string {
    switch (this.props.folder) {
      case ('c'): {
        return 'Kalkuleringer';
      }
      case ('v'): {
        return ('Valideringer');
      }
      case ('d'): {
        return ('Dynamikk');
      }
      default: {
        return 'Fil';
      }
    }
  }

  public getLanguageFromFileName = (): any => {
    const splitFileName = this.props.selectedFileName.split('.');
    if (splitFileName && splitFileName.length > 1) {
      const extension = splitFileName[splitFileName.length - 1];
      if (languages[extension]) {
        return languages[extension];
      }
    }

    return { name: '', displayName: ''};
  }

  public renderCloseButton = (): JSX.Element => {
    return (
      <Button onClick={this.props.closeLogicEditor}>Close</Button>
    );
  }

  public render() {
    console.log('doing something');
    const {classes, selectedFileName, availableFiles} = this.props;
    const foldertext = this.getFolderText();
    const language: ICodeLanguageItem = this.getLanguageFromFileName();
    return (
      <Grid container={true} spacing={0} className={classes.codeEditorContent}>
        <Grid item={true} xs={12}  className={classes.fileHeader}>
          <span>
            {foldertext}
            <i className='ai ai-expand' style={{fontSize: '2rem'}}/>
            <Select
              value={selectedFileName}
              classes={{root: classNames(classes.selectFile)}}
            >
              {availableFiles.map((file: string) => {
                return <MenuItem value={file} key={file}>{file}</MenuItem>;
              })}
            </Select>
          </span>
          {this.props.closeLogicEditor ? this.renderCloseButton() : null}
        </Grid>
        <Grid item={true} xs={12} className={classes.codeEditorContent}>
        <CodeEditor
          language={language.name}
          value={'// type some code here...'}
        />
        </Grid>
        <Grid item={true} xs={12}>
          <span>language: {language.displayName}</span>
        </Grid>
      </Grid>
    );
  }
}

export default withStyles(styles)(LogicEditor);
