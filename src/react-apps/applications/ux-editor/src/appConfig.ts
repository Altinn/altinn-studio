const appConfig = {
  serviceConfiguration: {
    getCodeLists: (window: Window) => {
      return {
        codeListUrlPreview: `${window.location.origin}/designer/{SERVICEPATH}/Codelist/Get?name=`,
        codeListUrlRuntime: `${window.location.origin}/api/Codelist/{SERVICEPATH}/Index/`,
        servicePathPlaceholder: '{SERVICEPATH}',
      };
    },
  },
};

export default appConfig;
