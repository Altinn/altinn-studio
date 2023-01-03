import React from 'react';

import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class FileUpload extends LayoutComponent<'FileUpload'> {
  render(props: PropsFromGenericComponent<'FileUpload'>): JSX.Element | null {
    return <FileUploadComponent {...props} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }
}
