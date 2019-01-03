import {Grid} from '@material-ui/core';
import { createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import CodeEditor from '../../../shared/src/code-editor/codeEditor';

// import theme from '../../../shared/src/theme/altinnStudioTheme';

// const altinnTheme = theme;

export interface ILogicEditorProvidedProps {
  classes: any;
  folder: string;
  selectedFileName: string;
}

const styles = createStyles({
  fileHeader: {
    borderBottom: '1px solid #C9C9C9',
    marginBottom: '1.6rem',
    paddingTop: '1rem',
    paddingBottom: '1.3rem',
  },
  codeEditorContent: {
    minHeight: '80vh',
  }
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

  public render() {
    const {classes, selectedFileName} = this.props;
    const foldertext = this.getFolderText();
    return (
      <Grid container={true} spacing={0} className={classes.codeEditorContent}>
        <Grid item={true} xs={12}  className={classes.fileHeader}>
          <span>
            {foldertext}
            <i className='ai ai-expand' style={{fontSize: '2rem'}}/>
            {selectedFileName}
          </span>
        </Grid>
        <Grid item={true} xs={12} className={classes.codeEditorContent}>
        <CodeEditor
          language={'typescript'}
        />
        </Grid>
        <Grid item={true} xs={12}>
          <span>language: C#</span>
        </Grid>
      </Grid>
    );
  }
}

export default withStyles(styles)(LogicEditor);
