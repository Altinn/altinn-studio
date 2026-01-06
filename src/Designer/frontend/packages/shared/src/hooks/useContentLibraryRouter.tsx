import { PageName } from '@studio/content-library';
import type { ContentLibraryRouter } from '@studio/content-library';
import { useNavigate, useParams, Link } from 'react-router-dom';
import type { HTMLAttributes } from 'react';
import React from 'react';

export function useContentLibraryRouter(basePath: string): ContentLibraryRouter {
  const location = useElementType();
  const navigate = useNavigate();
  const renderLink = (elementType: PageName, attributes: HTMLAttributes<HTMLAnchorElement>) => (
    <Link to={`${basePath}/${elementType}`} {...attributes} />
  );
  return { location, navigate, renderLink };
}

function useElementType(): PageName {
  const { elementType = PageName.LandingPage } = useParams();
  return isPageName(elementType) ? elementType : PageName.LandingPage;
}

function isPageName(value: string): value is PageName {
  return Object.values(PageName).includes(value as PageName);
}
