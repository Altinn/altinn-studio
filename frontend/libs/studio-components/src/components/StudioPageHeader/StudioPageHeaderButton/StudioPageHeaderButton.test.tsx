import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPageHeaderButton } from './StudioPageHeaderButton';
import { StudioPageHeaderContext } from '../context';
import { type StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import { type StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';

describe('StudioPageHeaderButton', () => {
  it('should apply the correct class based on variant and color - regular dark', () => {
    renderStudioPageHeaderButton({ variant: 'regular', color: 'dark' });

    const button = screen.getByRole('button');
    expect(button).toHaveClass('regularDark');
  });

  it('should apply the correct class based on variant and color - regular light', () => {
    renderStudioPageHeaderButton({ variant: 'regular', color: 'light' });

    const button = screen.getByRole('button');
    expect(button).toHaveClass('regularLight');
  });

  it('should apply the correct class based on variant and color - preview dark', () => {
    renderStudioPageHeaderButton({ variant: 'preview', color: 'dark' });

    const button = screen.getByRole('button');
    expect(button).toHaveClass('previewDark');
  });

  it('should apply the correct class based on variant and color - preview light', () => {
    renderStudioPageHeaderButton({ variant: 'preview', color: 'light' });

    const button = screen.getByRole('button');
    expect(button).toHaveClass('previewLight');
  });

  it('should forward ref to the button element', () => {
    const ref = React.createRef<HTMLButtonElement>();
    renderStudioPageHeaderButton({ color: 'dark' }, ref);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

type Props = {
  color: StudioPageHeaderColor;
  variant: StudioPageHeaderVariant;
};

const renderStudioPageHeaderButton = (
  props: Partial<Props> = {},
  ref?: React.Ref<HTMLButtonElement>,
) => {
  const { color = 'dark', variant = 'regular', ...restProps } = props;

  return render(
    <StudioPageHeaderContext.Provider value={{ variant }}>
      <StudioPageHeaderButton ref={ref} color={color} {...restProps}>
        Button
      </StudioPageHeaderButton>
    </StudioPageHeaderContext.Provider>,
  );
};
