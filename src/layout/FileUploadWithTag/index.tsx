import React from 'react';

import { FileUploadWithTagComponent } from 'src/layout/FileUploadWithTag/FileUploadWithTagComponent';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class FileUploadWithTag extends LayoutComponent<'FileUploadWithTag'> {
  render(props: PropsFromGenericComponent<'FileUploadWithTag'>): JSX.Element | null {
    return <FileUploadWithTagComponent {...props} />;
  }

  renderDefaultValidations(): boolean {
    return false;
  }
}
