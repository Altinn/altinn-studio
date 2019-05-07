import { mount } from 'enzyme';
import 'jest';
import * as React from 'react';
import * as networking from '../../../../shared/src/utils/networking';
import { KnownIssuesComponent } from '../../../src/features/knownIssues/knownIssues';

describe('>>> components/base/knownIssues.tsx', () => {
  let mockClasses: any;
  let mockLanguage: any;
  let mockGetResult: any;

  beforeEach(() => {
    mockClasses = {};
    mockLanguage = { dashboard: {} };
    // tslint:disable-next-line:max-line-length
    mockGetResult = '<html lang="en"><head></head><body><div id="readme" class="Box-body readme blob instapaper_body js-code-block-container"><article class="markdown-body entry-content p-5" itemprop="text"><p>Altinn.studio has now reached the first MVP milestone, and service developers (especially for pilot projects) are welcome to start using the solution to create services that should be released.</p><p>There are some known errors and weaknesses in the solution.</p><h2><a id="user-content-major-issues" class="anchor" aria-hidden="true" href="#major-issues"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"></path></svg></a>Major issues</h2><ul><li>The solution is not yet optimized for users using keyboard navigation and/or are visually impared</li><li>The container functionality in the UI editor should be considered experimental. It can be used, but will be percieved as buggy</li><li>Drag-and-drop functionality in the UI editor is sometimes unpredictable, especially in cases where the container functionality is used</li><li>There are currently two menues for navigating the solution, and the functionality you need are spread between them</li><li>All services (repositories) from the MTP period (before January 21 2019) have been deleted, as there were breaking changes to service functionality</li></ul><h2><a id="user-content-minor-issues-worth-mentioning" class="anchor" aria-hidden="true" href="#minor-issues-worth-mentioning"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"></path></svg></a>Minor issues worth mentioning</h2><ul><li>The visual difference between the different components in the UI-editor is smaller than ideal</li><li>You are able to edit (a local copy of) a service you do not have writing privileges to. You are, however, not able to publish those changes</li><li>Some parts of the Altinn Studio UI will reload while navigating, which may cause blinking and/or text string IDs being shown temporarily</li></ul><h2><a id="user-content-full-list-of-known-bugs" class="anchor" aria-hidden="true" href="#full-list-of-known-bugs"><svg class="octicon octicon-link" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"></path></svg></a>Full list of known bugs</h2><p>All bugs are registered in <a href="https://github.com/Altinn/altinn-studio/issues?q=is%3Aopen+is%3Aissue+label%3Abug">the Altinn studio Github issues list</a>. From this page you can also add new bugs to the issue list if you find any.</p></article></div></body></html>';

  });

  it('+++ should handle updating knownIssues state with stripped version of knownIssues page ftom github', async () => {
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
    expect(instance._isMounted).toBe(true);
    await Promise.resolve();
    expect(getSpy).toHaveBeenCalled();
    // tslint:disable-next-line:max-line-length
    expect(instance.state.knownIssues).toBe('<article class=\"markdown-body entry-content p-5\" itemprop=\"text\"><p>Altinn.studio has now reached the first MVP milestone, and service developers (especially for pilot projects) are welcome to start using the solution to create services that should be released.</p><p>There are some known errors and weaknesses in the solution.</p><h2><a id=\"user-content-major-issues\" class=\"anchor\" aria-hidden=\"true\" href=\"#major-issues\"><path fill-rule=\"evenodd\" d=\"M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z\"></path></a>Major issues</h2><ul><li>The solution is not yet optimized for users using keyboard navigation and/or are visually impared</li><li>The container functionality in the UI editor should be considered experimental. It can be used, but will be percieved as buggy</li><li>Drag-and-drop functionality in the UI editor is sometimes unpredictable, especially in cases where the container functionality is used</li><li>There are currently two menues for navigating the solution, and the functionality you need are spread between them</li><li>All services (repositories) from the MTP period (before January 21 2019) have been deleted, as there were breaking changes to service functionality</li></ul><h2><a id=\"user-content-minor-issues-worth-mentioning\" class=\"anchor\" aria-hidden=\"true\" href=\"#minor-issues-worth-mentioning\"><path fill-rule=\"evenodd\" d=\"M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z\"></path></a>Minor issues worth mentioning</h2><ul><li>The visual difference between the different components in the UI-editor is smaller than ideal</li><li>You are able to edit (a local copy of) a service you do not have writing privileges to. You are, however, not able to publish those changes</li><li>Some parts of the Altinn Studio UI will reload while navigating, which may cause blinking and/or text string IDs being shown temporarily</li></ul><h2><a id=\"user-content-full-list-of-known-bugs\" class=\"anchor\" aria-hidden=\"true\" href=\"#full-list-of-known-bugs\"><path fill-rule=\"evenodd\" d=\"M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z\"></path></a>Full list of known bugs</h2><p>All bugs are registered in <a href=\"https://github.com/Altinn/altinn-studio/issues?q=is%3Aopen+is%3Aissue+label%3Abug\">the Altinn studio Github issues list</a>. From this page you can also add new bugs to the issue list if you find any.</p></article>');
  });

  it('+++ should handle updating _isMounted on componentDidMount and componentWillUnmount', () => {
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
    expect(instance._isMounted).toBe(true);
    instance.componentWillUnmount();
    expect(instance._isMounted).toBe(false);
  });
});
