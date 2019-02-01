import { CircularProgress, Grid } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import MonacoEditor from 'react-monaco-editor';
import altinnTheme from '../../../shared/src/theme/altinnStudioTheme';

const theme = createMuiTheme(altinnTheme);

export interface IMonacoEditorComponentProps {
  classes: any;
  createCompletionSuggestions?: (monaco: any, filterText: string) => any[];
  heightPx?: any;
  isLoading?: boolean;
  language: string;
  onValueChange: (value: string) => void;
  value: string;
  widthPx?: any;
}

export interface IMonacoEditorComponentState {
  code: string;
}

export interface IMonacoEditorComponentWindow extends Window {
  MonacoEnvironment: any;
}

const styles = createStyles({
  spinner: {
    color: theme.altinnPalette.primary.blue,
  },
});

class MonacoEditorComponent extends React.Component<IMonacoEditorComponentProps, IMonacoEditorComponentState> {
  constructor(props: IMonacoEditorComponentProps) {
    super(props);
    this.state = {
      code: props.value,
    };
  }

  public editorWillMount = (monaco: any) => {
    monaco.languages.setMonarchTokensProvider('plaintext', {
      tokenizer: {
        root: [
          [/<<<<<<<.*/, 'outgoing'],
          [/=======.*/, 'split'],
          [/>>>>>>>.*/, 'incoming'],
        ],
      },
    });

    monaco.editor.defineTheme('editorTheme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'outgoing', foreground: 'ee0000', fontStyle: 'bold' },
        { token: 'split', foreground: 'ee0000', fontStyle: 'bold' },
        { token: 'incoming', foreground: 'ee0000', fontStyle: 'bold' },
      ],
      colors: {
        'merge.incomingHeaderBackground': '#00ff00',
      },
    });

    monaco.languages.registerCompletionItemProvider('csharp', {
      provideCompletionItems: (model: any, position: any) => {
        let textUntilPosition: string = model.getValueInRange(
          {
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
        );

        const match = textUntilPosition.match(/.*\./);
        textUntilPosition = textUntilPosition.trim();
        const suggestions = match ? this.props.createCompletionSuggestions(monaco, textUntilPosition) : [];
        return {
          suggestions,
          incomplete: true,
        };
      },
    });
  }

  public render() {
    const { classes } = this.props;
    return (
      this.props.isLoading ?
        (
          <Grid
            container={true}
            alignItems='center'
            justify='center'
            direction='column'
            style={{
              height: this.props.heightPx ? this.props.heightPx : '100%',
              width: this.props.widthPx ? this.props.heightPx : '100%',
            }}
          >
            <Grid
              container={true}
              item={true}
              alignItems='center'
              justify='center'
            >
              <Grid
                id='spinnerGridItem'
                item={true}
              >
                <CircularProgress className={classes.spinner} />

              </Grid>
            </Grid>
          </Grid>
        )
        :
        (
          <MonacoEditor
            theme={'editorTheme'}
            height={this.props.heightPx ? this.props.heightPx : '100%'}
            width={this.props.widthPx ? this.props.widthPx : '100%'}
            value={this.props.value}
            language={this.props.language}
            options={
              {
                autoClosingBrackets: 'always',
                autoIndent: true,
                automaticLayout: true,
                colorDecorators: true,
                minimap: {
                  enabled: false,
                },
                cursorBlinking: 'smooth',
                scrollbar: {
                  vertical: 'auto',
                },
                scrollBeyondLastLine: false,
              }
            }
            onChange={this.props.onValueChange}
            editorWillMount={this.editorWillMount}
          />
        )
    );
  }
}

export default withStyles(styles, { withTheme: true })(MonacoEditorComponent);
