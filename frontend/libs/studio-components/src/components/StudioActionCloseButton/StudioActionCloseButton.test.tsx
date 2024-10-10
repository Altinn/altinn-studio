import React, { type ForwardedRef } from 'react';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import {
  StudioActionCloseButton,
  type StudioActionCloseButtonProps,
} from './StudioActionCloseButton';
import { render, screen } from '@testing-library/react';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testOnClickCallbackReceivesNativeEvent } from '../../test-utils/testOnClickCallbackReceivesNativeEvent';

const defaultStudioActionCloseButtonProps: StudioActionCloseButtonProps = {
  onClick: jest.fn(),
};

describe('StudioActionCloseButton', () => {
  it('should support custom attributes', () => {
    const getActionButton = (): HTMLButtonElement =>
      screen.getByRole('button') as HTMLButtonElement;
    testCustomAttributes(renderStudioActionCloseButton, getActionButton);
  });

  it('should append given class name to root', () => {
    testRootClassNameAppending((className: string) =>
      renderStudioActionCloseButton({
        ...defaultStudioActionCloseButtonProps,
        className,
      }),
    );
  });

  it('should support forwarding the ref', () => {
    testRefForwarding<HTMLButtonElement>((ref) =>
      renderStudioActionCloseButton({ ...defaultStudioActionCloseButtonProps }, ref),
    );
  });

  it('should pass the native event to the onClick handler when the button is clicked', () => {
    const getActionButton = () => screen.getByRole('button') as HTMLButtonElement;
    testOnClickCallbackReceivesNativeEvent(
      (onClick) => renderStudioActionCloseButton({ onClick }),
      getActionButton,
    );
  });
});

const renderStudioActionCloseButton = (
  props?: StudioActionCloseButtonProps,
  ref?: ForwardedRef<HTMLButtonElement>,
) => {
  return render(
    <StudioActionCloseButton {...(props || defaultStudioActionCloseButtonProps)} ref={ref} />,
  );
};
