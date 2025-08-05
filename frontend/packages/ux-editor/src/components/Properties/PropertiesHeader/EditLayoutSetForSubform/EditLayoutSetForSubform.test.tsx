import React from 'react';
import { renderWithProviders } from '../../../../testing/mocks';
import { EditLayoutSetForSubform } from './EditLayoutSetForSubform';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '../../../../testing/componentMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { screen } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import { layoutSets } from 'app-shared/mocks/mocks';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import userEvent from '@testing-library/user-event';
import type { FormComponent } from '../../../../types/FormComponent';
import { AppContext } from '../../../../AppContext';
import { appContextMock } from '../../../../testing/appContextMock';
import * as router from 'react-router';

const handleComponentChangeMock = jest.fn();
const subformLayoutSetId = 'subformLayoutSetId';
const layoutSetsDefault = { sets: [{ id: subformLayoutSetId, type: 'subform' }] } as LayoutSets;

describe('EditLayoutSetForSubform', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should display the selected subform layout set in document and be read only', () => {
    renderEditLayoutSetForSubform({
      layoutSetsMock: layoutSetsDefault,
      componentProps: { layoutSet: subformLayoutSetId },
    });

    const selectedSubform = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.subform.selected_layout_set_title', {
        subform: subformLayoutSetId,
      }),
    });
    expect(selectedSubform).toHaveAttribute('aria-readonly');
  });

  it('should call navigate when navigating to subform', async () => {
    const navigateMock = jest.fn();
    jest.spyOn(router, 'useNavigate').mockImplementation(() => navigateMock);
    const user = userEvent.setup();
    renderEditLayoutSetForSubform({
      layoutSetsMock: layoutSetsDefault,
      componentProps: { layoutSet: subformLayoutSetId },
    });

    const navigateToSubformButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.navigate_to_subform_button'),
    });
    await user.click(navigateToSubformButton);
    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(
      `/testOrg/testApp/ui-editor/layoutSet/${subformLayoutSetId}`,
    );
  });

  it('should render the recommended next action card if no subform is selected', () => {
    renderEditLayoutSetForSubform({ layoutSetsMock: layoutSetsDefault });
    const card = screen.getByTestId('recommendedNextActionCard');
    expect(card).toBeInTheDocument();
  });
});

type RenderEditLayoutSetForSubformProps = {
  layoutSetsMock?: LayoutSets;
  componentProps?: Partial<FormComponent<ComponentType.Subform>>;
};

const renderEditLayoutSetForSubform = ({
  layoutSetsMock = layoutSets,
  componentProps = {},
}: RenderEditLayoutSetForSubformProps) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
  queryClient.setQueryData([QueryKey.AppMetadataModelIds, org, app, false], ['dataModelId']);

  return renderWithProviders(
    <AppContext.Provider value={{ ...appContextMock }}>
      <EditLayoutSetForSubform
        component={{ ...componentMocks[ComponentType.Subform], ...componentProps }}
        handleComponentChange={handleComponentChangeMock}
      />
    </AppContext.Provider>,
    { queryClient },
  );
};
