import * as React from 'react';
import MonacoEditor from 'react-monaco-editor';

export interface IMonacoEditorComponentProps {
  height?: string;
  width?: string;
  language: string;
  value: string;
  onValueChange: (value: string) => void;
  createCompletionSuggestions?: (monaco: any, filterText: string) => any[];
}

export interface IMonacoEditorComponentState {
  code: string;
}

export interface IMonacoEditorComponentWindow extends Window {
  MonacoEnvironment: any;
}

class MonacoEditorComponent extends React.Component<IMonacoEditorComponentProps, IMonacoEditorComponentState> {
  constructor(props: IMonacoEditorComponentProps, state: IMonacoEditorComponentState) {
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
    let { height, width } = this.props;
    height = height ? height : '100%';
    width = width ? width : '100%';
    return (
      <MonacoEditor
        theme={'editorTheme'}
        width={width}
        height={height}
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
    );
  }
}

export default MonacoEditorComponent;
