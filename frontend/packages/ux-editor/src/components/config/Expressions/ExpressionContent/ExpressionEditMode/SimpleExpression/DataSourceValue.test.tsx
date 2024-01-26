import React from 'react';
import { screen } from '@testing-library/react';
import type { DataSourceValueProps } from './DataSourceValue';
import { DataSourceValue } from './DataSourceValue';
import { DataSource } from '../../../../../../types/Expressions';
import { subExpression0 } from '../../../../../../testing/expressionMocks';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { renderWithMockStore } from '../../../../../../testing/mocks';
import { textMock } from '../../../../../../../../../testing/mocks/i18nMock';

describe('DataSourceValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    DataSource.ApplicationSettings,
    DataSource.Component,
    DataSource.DataModel,
    DataSource.InstanceContext,
  ])('should render a Select component when currentDataSource is %s', (dataSource) => {
    render({
      props: {
        currentDataSource: dataSource,
      },
    });

    const selectElement = screen.getByRole('combobox');
    expect(selectElement).toBeInTheDocument();
  });
  it('should render a TextField component when currentDataSource is DataSource.String', () => {
    render({
      props: {
        currentDataSource: DataSource.String,
      },
    });

    const textFieldElement = screen.getByRole('textbox');
    expect(textFieldElement).toBeInTheDocument();
  });
  it('should render a TextField component that have inputmode=numeric attribute when currentDataSource is DataSource.Number', () => {
    render({
      props: {
        currentDataSource: DataSource.Number,
      },
    });

    const textFieldElement = screen.getByRole('textbox');
    expect(textFieldElement).toHaveAttribute('inputmode', 'numeric');
    expect(textFieldElement).toBeInTheDocument();
  });
  it('should render a ToggleButtonGroup component with true and false buttons when currentDataSource is DataSource.Boolean', () => {
    render({
      props: {
        currentDataSource: DataSource.Boolean,
      },
    });

    const trueButton = screen.getByRole('button', { name: textMock('general.true') });
    const falseButton = screen.getByRole('button', { name: textMock('general.false') });
    expect(trueButton).toBeInTheDocument();
    expect(falseButton).toBeInTheDocument();
  });
  it('should not render select, textfield or button components when currentDataSource is DataSource.Null', () => {
    render({
      props: {
        currentDataSource: DataSource.Null,
      },
    });
    const selectElement = screen.queryByRole('combobox');
    expect(selectElement).not.toBeInTheDocument();
    const textFieldElement = screen.queryByRole('textbox');
    expect(textFieldElement).not.toBeInTheDocument();
    const buttonElement = screen.queryByRole('button');
    expect(buttonElement).not.toBeInTheDocument();
  });
});

const render = ({
  props = {},
  queries = {},
}: {
  props?: Partial<DataSourceValueProps>;
  queries?: Partial<ServicesContextProps>;
}) => {
  const defaultProps: DataSourceValueProps = {
    subExpression: subExpression0,
    currentDataSource: DataSource.Component,
    specifyDataSourceValue: jest.fn(),
    isComparableValue: false,
  };
  return renderWithMockStore({}, queries)(<DataSourceValue {...defaultProps} {...props} />);
};
