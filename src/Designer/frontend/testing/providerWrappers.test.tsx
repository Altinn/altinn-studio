import React from 'react';
import { render, screen } from '@testing-library/react';
import { composeWrappers } from './composeWrappers';
import { withServicesProvider, withPreviewConnection, withTestAppRouter } from './providerWrappers';

describe('providerWrappers', () => {
  describe('withServicesProvider', () => {
    it('should render children within ServicesContextProvider', () => {
      const Wrapper = composeWrappers([withServicesProvider()]);
      render(<div>test content</div>, { wrapper: Wrapper });
      expect(screen.getByText('test content')).toBeInTheDocument();
    });
  });

  describe('withPreviewConnection', () => {
    it('should render children within PreviewConnectionContextProvider', () => {
      const Wrapper = composeWrappers([withPreviewConnection()]);
      render(<div>test content</div>, { wrapper: Wrapper });
      expect(screen.getByText('test content')).toBeInTheDocument();
    });
  });

  describe('withTestAppRouter', () => {
    it('should render children within TestAppRouter', () => {
      const Wrapper = composeWrappers([withTestAppRouter()]);
      render(<div>test content</div>, { wrapper: Wrapper });
      expect(screen.getByText('test content')).toBeInTheDocument();
    });

    it('should accept custom initialPath and pathTemplate', () => {
      const Wrapper = composeWrappers([
        withTestAppRouter({
          initialPath: '/myOrg/myApp/extra',
          pathTemplate: '/:org/:app/*',
        }),
      ]);
      render(<div>routed content</div>, { wrapper: Wrapper });
      expect(screen.getByText('routed content')).toBeInTheDocument();
    });
  });

  describe('composition', () => {
    it('should compose all three common providers together', () => {
      const Wrapper = composeWrappers([
        withTestAppRouter(),
        withServicesProvider(),
        withPreviewConnection(),
      ]);
      render(<div>fully wrapped</div>, { wrapper: Wrapper });
      expect(screen.getByText('fully wrapped')).toBeInTheDocument();
    });
  });
});
