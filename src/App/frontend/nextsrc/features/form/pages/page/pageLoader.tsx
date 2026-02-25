import type { LoaderFunctionArgs } from 'react-router';

export const pageLoader = async ({ params }: LoaderFunctionArgs) => {
  const { pageId } = params;

  if (!pageId) {
    throw new Error('Route param missing: pageId');
  }

  return { pageId };
};
