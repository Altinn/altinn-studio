const applicationSettingsJSON = `{
  "id": "mockOrg/test-app",
  "org": "mockOrg",
  "title": {
    "nb": "Test App"
  }}`;

export const getApplicationSettingsMock = () => JSON.parse(applicationSettingsJSON);
