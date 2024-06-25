import { useFormLayoutSettingsQuery } from '@altinn/ux-editor/hooks/queries/useFormLayoutSettingsQuery';

export const usePdfLayoutName = (
  org: string,
  app: string,
  layoutSetName: string,
): string | undefined => {
  const { data: layoutSettings } = useFormLayoutSettingsQuery(org, app, layoutSetName);
  return layoutSettings.pages.pdfLayoutName || undefined;
};
