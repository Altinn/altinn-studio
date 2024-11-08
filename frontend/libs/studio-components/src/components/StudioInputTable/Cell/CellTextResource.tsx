import { StudioTable } from '../../StudioTable';
import type { ReactElement } from 'react';
import React from 'react';
import { BaseInputCell } from './BaseInputCell';
import {
  StudioTextResourceInput,
  StudioTextResourceInputProps,
} from '../../StudioTextResourceInput/StudioTextResourceInput';

export type CellTextResourceInputProps = StudioTextResourceInputProps & {
  className?: string;
};

export class CellTextResource extends BaseInputCell<
  HTMLInputElement | HTMLButtonElement,
  CellTextResourceInputProps
> {
  render({ className, ...rest }: CellTextResourceInputProps): ReactElement {
    return (
      <StudioTable.Cell className={className}>
        <StudioTextResourceInput {...rest} />
      </StudioTable.Cell>
    );
  }

  shouldMoveFocusOnArrowKey() {
    return true;
  }

  shouldMoveFocusOnEnterKey = () => false;
}
