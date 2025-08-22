import React from 'react';
import { Modal } from '@digdir/designsystemet-react';
import type { ModalRootProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioModalRootProps = WithoutAsChild<ModalRootProps>;

export const StudioModalRoot = ({ children, ...rest }: StudioModalRootProps) => (
  <Modal.Root {...rest}>{children}</Modal.Root>
);

StudioModalRoot.displayName = 'StudioModal';
