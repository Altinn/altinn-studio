const appConfig = {
  appConfiguration: {
    getCodeLists: (window: Window) => {
      return {
        codeListUrlPreview: `${window.location.origin}/designer/{APPID}/Codelist/Get?name=`,
        codeListUrlRuntime: `${window.location.origin}/api/Codelist/{APPID}/Index/`,
        appIdPlaceholder: '{APPID}',
      };
    },
  },
};

export default appConfig;
