import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as networking from 'app-shared/utils/networking';
import { KnownIssuesComponent } from '../../../../features/knownIssues/knownIssues';

describe('>>> components/base/knownIssues.tsx', () => {
  let mockClasses: any;
  let mockLanguage: any;
  let mockGetResult: any;

  beforeEach(() => {
    mockClasses = {};
    mockLanguage = { dashboard: {} };
    mockGetResult = 'default';
  });

  it('+++ should handle updating knownIssues state', async () => {
    const mountedComponent = mount(
      (
        <KnownIssuesComponent
          language={mockLanguage}
          classes={mockClasses}
        />
      ),
    );

    const instance = mountedComponent.instance() as KnownIssuesComponent;
    const getSpy = jest.spyOn(networking, 'get').mockImplementation(() => Promise.resolve(mockGetResult));
    instance.componentDidMount();
    expect(instance.componentMounted).toBe(true);
    await Promise.resolve();
    expect(getSpy).toHaveBeenCalled();
    expect(instance.state.knownIssues).not.toBe('default');
  });

  it('+++ should handle updating componentMounted on componentDidMount and componentWillUnmount', () => {
    const mountedComponent = mount(
      (
        <KnownIssuesComponent
          language={mockLanguage}
          classes={mockClasses}
        />
      ),
    );

    const instance = mountedComponent.instance() as KnownIssuesComponent;
    instance.componentDidMount();
    expect(instance.componentMounted).toBe(true);
    instance.componentWillUnmount();
    expect(instance.componentMounted).toBe(false);
  });
});
