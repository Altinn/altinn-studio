## Local testing of apps

Localtest emulates the Altinn 3 platform services needed to run apps locally.

- [Prerequisites](#prerequisites)
- [Changing test data](#changing-test-data)
- [k6 testing](#k6-testing)
- [Known issues](#known-issues)

### Prerequisites

1. .NET SDK matching your service.
2. Newest [Git](https://git-scm.com/downloads).
3. A code editor.
4. Docker or Podman.
5. `studioctl`

### Changing test data

In some cases your application might differ from the default setup and require custom changes to the test data.

#### Add a missing role for a test user

1. Identify the role list you need to modify by noting the userId of the user representing an entity, and the partyId of the entity you want to represent.
2. Find the correct `roles.json` file in `testdata/authorization/roles` by navigating to `User_{userID}\party_{partyId}\roles.json`.
3. Add a new entry in the list for the role you require.

```json
{
  "Type": "altinn",
  "value": "[Insert role code here]"
}
```

4. Save and close the file.
5. Restart Localtest.

### k6 testing

In the k6 folder there is a sample loadtest that can be adapted to run automated tests against a local app.

```shell
cp k6/loadtest.sample.js k6/loadtest.js
# Edit k6/loadtest.js to fit your application.
docker run --rm -i --net=host grafana/k6:master-with-browser run - <k6/loadtest.js
```

For a decent editing experience, run `npm install` and use an editor with JS support.

### Known issues

#### Localtest reports that the app is not running even though it is

If Localtest and your app are running, but Localtest reports that the app is not running, it might be that the port is not open in the firewall.

Verify the app by opening `http://localhost:5005/<app-org-name>/<app-name>/swagger/index.html`.

If this is the case, open Windows PowerShell as administrator and run `OpenAppPortInHyperVFirewall.ps1` from the `scripts` folder.
