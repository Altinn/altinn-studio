import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../testing/mocks';
import { TitleMainConfig, type TitleMainConfigProps } from './TitleMainConfig';
import { componentMocks } from '../../../../testing/componentMocks';
import { ComponentType } from '../../../../../../shared/src/types/ComponentType';
import { QueryKey } from '../../../../../../shared/src/types/QueryKey';
import { createQueryClientMock } from '../../../../../../shared/src/mocks/queryClientMock';
import { componentSchemaMocks } from '../../../../testing/componentSchemaMocks';
import { titleMainProperties } from './TitleMainConfig';

describe('TitleMainConfig', () => {
  it('should render specific main configs based on enum TitleProperties for header component', () => {
    renderTitleMainConfig();

    titleMainProperties.forEach((property) => {
      const propertyElement = screen.getByText(
        textMock(`ux_editor.component_properties.${property}`),
      );
      expect(propertyElement).toBeInTheDocument();
    });
  });
});

const renderTitleMainConfig = () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.FormComponent, componentMocks[ComponentType.Header].type],
    componentSchemaMocks[componentMocks[ComponentType.Header].type],
  );

  const defaultProps: TitleMainConfigProps = {
    component: componentMocks[ComponentType.Header],
    handleComponentChange: jest.fn(),
  };

  return renderWithProviders(<TitleMainConfig {...defaultProps} />, {
    queryClient,
  });
};
