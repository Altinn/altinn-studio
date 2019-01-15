import {Grid, IconButton, MenuItem, Select} from '@material-ui/core';
import { createStyles, withStyles } from '@material-ui/core/styles';
import classNames = require('classnames');
import * as React from 'react';
import MonacoEditorComponent from '../../../shared/src/file-editor/MonacoEditorComponent';
import { get, post } from '../utils/networking';

import theme from '../../../shared/src/theme/altinnStudioTheme';

const altinnTheme = theme;

export interface ICodeLanguageItem {
  name: string;
  displayName: string;
}

export interface ICodeLanguage {
  [id: string]: ICodeLanguageItem;
}

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

export interface IFileEditorProvidedProps {
  classes: any;
  mode: number;
  closeFileEditor?: () => void;
}

export interface IFileEditorState {
  selectedFile: string;
  availableFiles: string[];
  value: string;
}

const styles = createStyles({
  fileHeader: {
    borderBottom: '1px solid #C9C9C9',
    marginBottom: '1.6rem',
    paddingTop: '1.2rem',
    paddingLeft: '1.3rem',
    paddingBottom: '1.1rem',
  },
  codeEditorContent: {
    minHeight: 'calc(100vh - 5.7em)',
  },
  selectFile: {
    borderBottom: '1px solid' + altinnTheme.altinnPalette.primary.blueDark,
    fontSize: '1.6rem',
  },
  fileMenuItem: {
    fontSize: '1.6rem',
  },
  selectMenu: {
    paddingRight: '0',
  },
  hideIcon: {
    display: 'none',
  },
  formComponentsBtn: {
    fontSize: '0.85em',
    fill: altinnTheme.altinnPalette.primary.blue,
    paddingLeft: '0',
    marginTop: '0.1em',
    outline: 'none !important',
    '&:hover': {
      background: 'none',
    },
  },
  specialBtn: {
    fontSize: '0.6em !important',
  },
});

class FileEditor extends React.Component<IFileEditorProvidedProps, IFileEditorState> {
  constructor(props: IFileEditorProvidedProps) {
    super(props);
    this.state = {
      selectedFile: '',
      availableFiles: [],
      value: '',
    };
  }

  public componentDidMount() {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service} = altinnWindow;
    const servicePath = `${org}/${service}`;
    get(`${altinnWindow.location.origin}/designer/${servicePath}/ServiceDevelopment` +
    `/GetServiceFiles?fileEditorMode=${this.props.mode}`).then((response) => {
      const files = response.split(',');
      this.loadFileContent(files[0]);
      this.setState((prevState: IFileEditorState) => {
        return {
          ...prevState,
          availableFiles: files,
        };
      });
    });
  }

  public loadFileContent = (fileName: string) => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service} = altinnWindow;
    const servicePath = `${org}/${service}`;
    get(`${altinnWindow.location.origin}/designer/${servicePath}/ServiceDevelopment` +
      `/GetServiceFile?fileEditorMode=${this.props.mode}&fileName=${fileName}`)
      .then((logicFileContent) => {
        this.setState((prevState: IFileEditorState) => {
          return {
            ...prevState,
            selectedFile: fileName,
            value: logicFileContent,
          };
        });
      });
  }

  public getFolderText(): string {
    switch (this.props.mode) {
      case 1: {
        return 'Deployment';
      }
      case 2: {
        return 'Implementation';
      }
      case 3: {
        return 'Metadata';
      }
      case 4: {
        return 'Model';
      }
      case 5: {
        return 'Resources';
      }
      case 6: {
        return 'Test';
      }
      case 0:
      default: {
        return 'All';
      }
    }
  }

  public switchFile = (e: any) => {
    const fileName = e.target.value;
    this.loadFileContent(fileName);
  }

  public saveFile = (e: any) => {
    const altinnWindow: IAltinnWindow = window as IAltinnWindow;
    const { org, service} = altinnWindow;
    const servicePath = `${org}/${service}`;
    const postUrl = `${altinnWindow.location.origin}/designer/${servicePath}/ServiceDevelopment` +
    `/SaveServiceFile?fileEditorMode=${this.props.mode}&fileName=${this.state.selectedFile}`;
    post(postUrl, this.state.value, {headers: {'Content-type': 'text/plain;charset=utf-8'}}).then((response) => {
      if (this.props.closeFileEditor) {
        this.props.closeFileEditor();
      }
    });
  }

  public onValueChange = (value: string) => {
    this.setState((prevState: IFileEditorState) => {
      return {
        ...prevState,
        value,
      };
    });
  }

  public getLanguageFromFileName = (): any => {
    const splitFileName = this.state.selectedFile.split('.');
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
      <Grid
          item={true}
          xs={1}
          className={this.props.classes.fileHeader}
      >
        <IconButton
          type='button'
          className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
          onClick={this.props.closeFileEditor}
        >
          <i className='ai ai-circlecancel' />
        </IconButton>
        <IconButton
          type='button'
          className={this.props.classes.formComponentsBtn + ' ' + this.props.classes.specialBtn}
          onClick={this.saveFile}
        >
          <i className='ai ai-circlecheck' />
        </IconButton>
      </Grid>
    );
  }

  public render() {
    const {classes} = this.props;
    const foldertext = this.getFolderText();
    const language: ICodeLanguageItem = this.getLanguageFromFileName();
    return (
      <Grid container={true} spacing={0} className={classes.codeEditorContent}>
        <Grid item={true} xs={11}  className={classes.fileHeader}>
          <span>
            {foldertext}
            <i className='ai ai-expand' style={{fontSize: '2rem'}}/>
            <Select
              value={this.state.selectedFile}
              classes={
                {
                  root: classNames(classes.selectFile),
                  icon: classNames(classes.hideIcon),
                  selectMenu: classNames(classes.selectMenu)}
              }
              onChange={this.switchFile}
            >
              {this.state.availableFiles.map((file: string) => {
                return (
                  <MenuItem
                    value={file}
                    key={file}
                    className={classes.fileMenuItem}
                  >
                    {file}
                  </MenuItem>
                );
              })}
            </Select>
          </span>

        </Grid>
        {this.props.closeFileEditor ? this.renderCloseButton() : null}

        <Grid item={true} xs={12} className={classes.codeEditorContent}>
        <MonacoEditorComponent
          language={language.name}
          value={this.state.value}
          onValueChange={this.onValueChange}
        />
        </Grid>
        <Grid item={true} xs={11}/>
        <Grid item={true} xs={1}>
          <span>{language.displayName}</span>
        </Grid>
      </Grid>
    );
  }
}

export default withStyles(styles, {withTheme: true})(FileEditor);
