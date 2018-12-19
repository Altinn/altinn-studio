import * as React from 'react';
import CodeEditor from '../../../shared/src/code-editor/codeEditor';

class LogicEditor extends React.Component<any, any> {
  public render() {
    return (
      <div>
        <h2>Code editor!</h2>
        <CodeEditor
          height={'500px'}
        />
      </div>
    );
  }
}

export default LogicEditor;
