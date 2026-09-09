import { render } from '@testing-library/react';

import { FullWidthWrapper, type IFullWidthWrapperProps } from './FullWidthWrapper';
import classes from './FullWidthWrapper.module.css';

const renderWrapper = (props?: IFullWidthWrapperProps) => {
  const result = render(
    <FullWidthWrapper {...props}>
      <p>Test</p>
    </FullWidthWrapper>,
  );

  return { wrapper: result.container.firstChild as HTMLElement, ...result };
};

describe('FullWidthWrapper', () => {
  it('should render children', () => {
    const { getByText } = renderWrapper();

    expect(getByText('Test')).toBeInTheDocument();
  });

  it.each([
    ['isOnBottom', { isOnBottom: true }, classes.consumeBottomPadding],
    ['isOnTop', { isOnTop: true }, classes.consumeTopPadding],
  ] as const)('should have correct class when %s is true', (_propName, props, expectedClass) => {
    const { wrapper } = renderWrapper(props);

    expect(wrapper).toHaveClass(expectedClass);
  });
});
