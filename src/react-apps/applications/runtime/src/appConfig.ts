const appConfig = {
  serviceConfiguration: {
    getCodeLists: (window: Window) => ({
      codeListUrlPreview: `${window.location.origin}/designer/{SERVICEPATH}/Codelist/Get?name=`,
      codeListUrlRuntime: `${window.location.origin}/runtime/api/Codelist/{SERVICEPATH}/Index/`,
      servicePathPlaceholder: '{SERVICEPATH}',
    }),
  },
};

export default appConfig;
