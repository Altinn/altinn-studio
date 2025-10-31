export default function getLayoutSetPath(org: string, app: string, layoutSetId: string): string {
  return `/${org}/${app}/ui-editor/layoutSet/${layoutSetId}`;
}
