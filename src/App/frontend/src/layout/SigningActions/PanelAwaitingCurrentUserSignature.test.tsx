import React from 'react';
import { useParams } from 'react-router';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRequestFocus } from 'src/core/contexts/ElementFocusProvider';
import { useIsAuthorized, useProcessQuery } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useProfile } from 'src/features/profile/ProfileProvider';
import {
  useAuthorizedOrganizationDetails,
  useSigningMutation,
  useUserSigneeParties,
} from 'src/layout/SigningActions/api';
import { AwaitingCurrentUserSignaturePanel } from 'src/layout/SigningActions/PanelAwaitingCurrentUserSignature';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { SubmitSigningButton } from 'src/layout/SigningActions/SubmitSigningButton';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

vi.mock('react-router');
vi.mock('src/core/contexts/ElementFocusProvider');
vi.mock('src/features/instance/useProcessQuery');
vi.mock('src/features/language/Lang');
vi.mock('src/features/language/useLanguage');
vi.mock('src/features/profile/ProfileProvider');
vi.mock('src/layout/SigningActions/api');
vi.mock('src/layout/SigningActions/OnBehalfOfChooser');
vi.mock('src/layout/SigningActions/PanelSigning');
vi.mock('src/layout/SigningActions/SubmitSigningButton');
vi.mock('src/utils/layout/useNodeItem');

describe('AwaitingCurrentUserSignaturePanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(useParams).mockReturnValue({ instanceOwnerPartyId: '123', instanceGuid: 'guid' });
    vi.mocked(useRequestFocus).mockReturnValue(vi.fn());
    vi.mocked(useIsAuthorized).mockReturnValue(() => true);
    vi.mocked(useLanguage).mockReturnValue({
      langAsString: (inputString: string) => inputString,
    } as unknown as ReturnType<typeof useLanguage>);
    vi.mocked(Lang).mockImplementation(({ id }: { id: string }) => id);
    vi.mocked(useProfile).mockReturnValue({ partyId: 123 } as unknown as ReturnType<typeof useProfile>);
    vi.mocked(useItemWhenType).mockReturnValue({ textResourceBindings: {} } as unknown as ReturnType<
      typeof useItemWhenType
    >);
    vi.mocked(useAuthorizedOrganizationDetails).mockReturnValue({
      data: { organizations: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof useAuthorizedOrganizationDetails>);
    vi.mocked(useUserSigneeParties).mockReturnValue([]);
    vi.mocked(useSigningMutation).mockReturnValue({
      mutate: vi.fn(),
      error: null,
      isPending: false,
    } as unknown as ReturnType<typeof useSigningMutation>);
    vi.mocked(SigningPanel).mockImplementation(({ actionButton }) => <div>{actionButton}</div>);
    vi.mocked(SubmitSigningButton).mockReturnValue(<div data-testid='submit-signing-button' />);
  });

  function mockCurrentTaskElementType(elementType: string) {
    vi.mocked(useProcessQuery).mockReturnValue({
      data: { currentTask: { elementType } },
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProcessQuery>);
  }

  it('renders the submit button when every signature is present on an ordinary task', () => {
    mockCurrentTaskElementType('Task');

    render(
      <AwaitingCurrentUserSignaturePanel
        baseComponentId='whatever'
        hasMissingSignatures={false}
      />,
    );

    expect(screen.getByTestId('submit-signing-button')).toBeInTheDocument();
  });

  it('does not render the submit button while the signing round is open on a service task', () => {
    mockCurrentTaskElementType('ServiceTask');

    render(
      <AwaitingCurrentUserSignaturePanel
        baseComponentId='whatever'
        hasMissingSignatures={false}
      />,
    );

    expect(screen.queryByTestId('submit-signing-button')).not.toBeInTheDocument();
  });
});
