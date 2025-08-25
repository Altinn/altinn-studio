import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioPageHeaderMain, type StudioPageHeaderMainProps } from './StudioPageHeaderMain';
import { StudioPageHeaderContext } from '../context';
import { type StudioPageHeaderContextProps } from '../context/StudioPageHeaderContext';

describe('StudioPageHeaderMain', () => {
  it('should render the children passed to it', () => {
    const childText = 'Test Child';

    renderStudioPageHeaderMain({ componentProps: { children: <div>{childText}</div> } });

    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  it('should apply the correct variant when context variant is "regular"', () => {
    const componentText: string = 'Test child';
    const contextPreview = 'regular';

    renderStudioPageHeaderMain({
      componentProps: { children: componentText },
      providerProps: { variant: contextPreview },
    });

    expect(screen.getByText(componentText)).toHaveClass(contextPreview);
  });

  it('should apply the correct variant when context variant is "preview"', () => {
    const componentText: string = 'Test child';
    const contextPreview = 'preview';

    renderStudioPageHeaderMain({
      componentProps: { children: componentText },
      providerProps: { variant: contextPreview },
    });

    expect(screen.getByText(componentText)).toHaveClass(contextPreview);
  });
});

type Props = {
  componentProps: StudioPageHeaderMainProps;
  providerProps: Partial<StudioPageHeaderContextProps>;
};

const defaultProps: Props = {
  componentProps: { children: <div>Test Child</div> },
  providerProps: { variant: 'regular' },
};
const renderStudioPageHeaderMain = (props: Partial<Props> = {}): RenderResult => {
  const { componentProps, providerProps = { variant: 'regular' } } = props;
  const { componentProps: defaultComponentProps } = defaultProps;

  return render(
    <StudioPageHeaderContext.Provider value={providerProps}>
      <StudioPageHeaderMain {...defaultComponentProps} {...componentProps} />
    </StudioPageHeaderContext.Provider>,
  );
};
