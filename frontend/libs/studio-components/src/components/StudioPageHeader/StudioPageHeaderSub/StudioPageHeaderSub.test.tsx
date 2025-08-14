import React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { StudioPageHeaderSub, type StudioPageHeaderSubProps } from './StudioPageHeaderSub';
import { StudioPageHeaderContext } from '../context';
import { type StudioPageHeaderContextProps } from '../context/StudioPageHeaderContext';

describe('StudioPageHeaderSub', () => {
  it('should render the children passed to it', () => {
    const childText = 'Test Child';
    renderStudioPageHeaderSub({ componentProps: { children: <div>{childText}</div> } });

    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  it('should apply the correct variant when context variant is "regular"', () => {
    const componentText: string = 'Test child';
    const contextPreview = 'regular';
    renderStudioPageHeaderSub({
      componentProps: { children: componentText },
      providerProps: { variant: contextPreview },
    });

    expect(screen.getByText(componentText)).toHaveClass(`${contextPreview}Sub`);
  });

  it('should apply the correct variant when context variant is "preview"', () => {
    const componentText: string = 'Test child';
    const contextPreview = 'preview';
    renderStudioPageHeaderSub({
      componentProps: { children: componentText },
      providerProps: { variant: contextPreview },
    });

    expect(screen.getByText(componentText)).toHaveClass(`${contextPreview}Sub`);
  });
});

type Props = {
  componentProps: StudioPageHeaderSubProps;
  providerProps: Partial<StudioPageHeaderContextProps>;
};

const renderStudioPageHeaderSub = (props: Partial<Props>): RenderResult => {
  const { componentProps, providerProps = { variant: 'regular' } } = props;

  return render(
    <StudioPageHeaderContext.Provider value={providerProps}>
      <StudioPageHeaderSub {...componentProps} />
    </StudioPageHeaderContext.Provider>,
  );
};
