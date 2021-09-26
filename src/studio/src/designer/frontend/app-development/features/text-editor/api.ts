const altinnWindow: IAltinnWindow = window as Window as IAltinnWindow;
const basePath = `${altinnWindow.location.origin}/designer/${altinnWindow.org}/${altinnWindow.app}`;

export function getCookieValue(name: string) {
  var match = document.cookie.match(new RegExp("(^| )" + encodeURIComponent(name) + "=([^;]+)"));
  if (match) {
    return match[2];
  }

  return "";
}


export type Languages = "nb" | "nn" | "en"; // And possible more, but we don't special case
export type getLanguagesResponse = Languages[];
export function getLanguagesUrl() {
  return `${basePath}/Text/GetLanguages`;
}

export type getCulturesResponse = {
  cultures: { id: Languages; name: string }[];
};
export function getCulturesUrl() {
  return `${altinnWindow.location.origin}/designer/json/cultures.json`;
}

// export type getResourceResponse =
//   | {
//       language: Languages;
//       resources: {
//         id: string;
//         value: string;
//       }[];
//     }
//   | "";

// export function getResourceUrl(id: string) {
//   return `${basePath}/Text/GetResource/${id}`;
// }

export type getResourcesResponse = {
  [id: string]:
  {
    [languageCode: string]: string
  }
}
export function getResourcesUrl() {
  return `${basePath}/Text/GetResources`
}

export type saveResourcesRequest = {

  edited: {
    [id: string]: { [lang: string]: string };
  };
  deletedIds: string[];

}
export function getSaveResourcesUrl() {
  return `${basePath}/Text/SaveResources`
}

export function getDeleteLanguageUrl(language: Languages) {
  return `${basePath}/Text/DeleteLanguage/${language}`
}

export function deleteLanguage(language: Languages) {
  fetch(getDeleteLanguageUrl(language), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-XSRF-TOKEN": getCookieValue("XSRF-TOKEN")
    }
  })
}