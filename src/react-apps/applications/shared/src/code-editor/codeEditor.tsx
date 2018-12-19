import * as React from 'react';
import MonacoEditor from 'react-monaco-editor';

export interface ICodeEditorProps { }

export interface ICodeEditorState {
  code: string;
 }

class CodeEditor extends React.Component<ICodeEditorProps, ICodeEditorState> {
  constructor(props: ICodeEditorProps, state: ICodeEditorState) {
    super(props);
    this.state = {
      code: '// Type some code here...',
    };
  }
  public render() {
    return (
      <MonacoEditor />
    );
  }
}

export default CodeEditor;
