import * as React from 'react';
//import CodeEditor from '../../../shared/src/code-editor/codeEditor';
import MonacoEditor from '../../../shared/src/code-editor/codeEditorJs';

class LogicEditor extends React.Component<any, any> {
  public render() {
    return (
      <div>
        <h2>Code editor!</h2>
        <MonacoEditor/>
      </div>
    );
  }
}

export default LogicEditor;
