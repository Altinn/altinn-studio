/**
 * @deprecated
 */
export const _useParamsClassCompHack = () => {
  const parts = window.location.pathname.split('/');
  return {
    org: parts[2],
    app: parts[3],
  };
};
