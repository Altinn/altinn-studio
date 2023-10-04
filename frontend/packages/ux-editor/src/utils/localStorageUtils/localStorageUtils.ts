/**
 * Updates the selected layout in local storage
 *
 * @param instanceId storage key - Need to use InstanceId as storage key since apps uses it and it is needed to sync layout between preview and editor
 * @param layoutName name of the layout
 */
export const setSelectedLayoutInLocalStorage = (instanceId: string, layoutName: string) => {
  if (instanceId) {
    localStorage.setItem(instanceId, layoutName);
  }
};
