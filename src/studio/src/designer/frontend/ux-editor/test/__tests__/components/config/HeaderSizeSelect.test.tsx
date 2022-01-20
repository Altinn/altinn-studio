import * as React from 'react';
import {
  screen,
  render as rtlRender,
  within,
  fireEvent,
} from '@testing-library/react';

import { HeaderSizeSelect } from '../../../../components/config/HeaderSizeSelect';

const h4Text = 'Undertittel (H4)';
const h3Text = 'Undertittel (H3)';
const h2Text = 'Undertittel (H2)';

const render = ({
  size = undefined,
  handleUpdateHeaderSize = jest.fn(),
  handleTitleChange = jest.fn(),
} = {}) => {
  rtlRender(
    <HeaderSizeSelect
      renderChangeId={() => <div>id</div>}
      handleTitleChange={handleTitleChange}
      handleUpdateHeaderSize={handleUpdateHeaderSize}
      language={{
        ux_editor: {
          modal_header_type_h4: h4Text,
          modal_header_type_h3: h3Text,
          modal_header_type_h2: h2Text,
        },
      }}
      textResources={[{ id: 'title-1', value: 'Another title' }]}
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: 'Header',
        textResourceBindings: {
          title: 'ServiceName',
        },
        size,
      }}
    />,
  );
};

interface IOpenHeaderSelect {
  selectWrapperTestId: string;
}

const openHeaderSelect = ({ selectWrapperTestId }: IOpenHeaderSelect) => {
  const headerSizeSelectWrapper = screen.getByTestId(selectWrapperTestId);
  const toggle = within(headerSizeSelectWrapper).getByDisplayValue('');

  fireEvent.focus(toggle);
  fireEvent.keyDown(toggle, { key: 'ArrowDown', keyCode: 40 });
};

describe('HeaderSizeSelect', () => {
  it('should show selected title size as h4 when no size is set', () => {
    render();

    expect(screen.getByText(h4Text)).toBeInTheDocument();
    expect(screen.queryByText(h3Text)).not.toBeInTheDocument();
    expect(screen.queryByText(h2Text)).not.toBeInTheDocument();
  });

  it('should show selected title size as h4 when "h4" size is set', () => {
    render({ size: 'h4' });

    expect(screen.getByText(h4Text)).toBeInTheDocument();
    expect(screen.queryByText(h3Text)).not.toBeInTheDocument();
    expect(screen.queryByText(h2Text)).not.toBeInTheDocument();
  });

  it('should show selected title size as h4 when "S" size is set', () => {
    render({ size: 'S' });

    expect(screen.getByText(h4Text)).toBeInTheDocument();
    expect(screen.queryByText(h3Text)).not.toBeInTheDocument();
    expect(screen.queryByText(h2Text)).not.toBeInTheDocument();
  });

  it('should show selected title size as h3 when "h3" size is set', () => {
    render({ size: 'h3' });

    expect(screen.queryByText(h4Text)).not.toBeInTheDocument();
    expect(screen.getByText(h3Text)).toBeInTheDocument();
    expect(screen.queryByText(h2Text)).not.toBeInTheDocument();
  });

  it('should show selected title size as h3 when "M" size is set', () => {
    render({ size: 'M' });

    expect(screen.queryByText(h4Text)).not.toBeInTheDocument();
    expect(screen.getByText(h3Text)).toBeInTheDocument();
    expect(screen.queryByText(h2Text)).not.toBeInTheDocument();
  });

  it('should show selected title size as h2 when "h2" size is set', () => {
    render({ size: 'h2' });

    expect(screen.queryByText(h4Text)).not.toBeInTheDocument();
    expect(screen.queryByText(h3Text)).not.toBeInTheDocument();
    expect(screen.getByText(h2Text)).toBeInTheDocument();
  });

  it('should show selected title size as h2 when "L" size is set', () => {
    render({ size: 'L' });

    expect(screen.queryByText(h4Text)).not.toBeInTheDocument();
    expect(screen.queryByText(h3Text)).not.toBeInTheDocument();
    expect(screen.getByText(h2Text)).toBeInTheDocument();
  });

  it('should call handleUpdateHeaderSize when size is changed', () => {
    const handleUpdateHeaderSize = jest.fn();
    render({ handleUpdateHeaderSize, size: 'h4' });

    openHeaderSelect({ selectWrapperTestId: 'header-size-select-wrapper' });

    const h2Select = screen.getByText(h2Text);

    fireEvent.click(h2Select);

    expect(handleUpdateHeaderSize).toHaveBeenCalledWith(
      { label: 'Undertittel (H2)', value: 'h2' },
      { action: 'select-option', name: undefined, option: undefined },
    );
  });

  it('should call handleTitleChange when title is changed', () => {
    const handleTitleChange = jest.fn();
    render({ handleTitleChange, size: 'h4' });

    openHeaderSelect({
      selectWrapperTestId: 'header-resource-select-wrapper',
    });

    const titleSelect = screen.getByText('Another title (title-1)');

    fireEvent.click(titleSelect);

    expect(handleTitleChange).toHaveBeenCalledWith({
      label: 'Another title\n(title-1)',
      value: 'title-1',
    });
  });
});
