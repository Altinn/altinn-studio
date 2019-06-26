const appConfig = {
  serviceConfiguration: {
    getCodeLists: (window: Window) => {
      let routePrefix: string = null;
      if (window.location.origin.includes('altinn.studio') || window.location.origin.includes('altinn3.no')) {
        routePrefix = '/runtime';
      }
      return {
        codeListUrlPreview: `${window.location.origin}/designer/{SERVICEPATH}/Codelist/Get?name=`,
        codeListUrlRuntime: `${window.location.origin}${routePrefix}/api/Codelist/{SERVICEPATH}/Index/`,
        servicePathPlaceholder: '{SERVICEPATH}',
      };
    },
  },
};

export default appConfig;
