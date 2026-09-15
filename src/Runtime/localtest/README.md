## Local testing of apps

Localtest emulates the Altinn 3 platform services needed to run apps locally.

- [Local testing of apps](#local-testing-of-apps)
  - [Prerequisites](#prerequisites)
  - [Changing test data](#changing-test-data)
    - [Add a missing role for a test user](#add-a-missing-role-for-a-test-user)
  - [k6 testing](#k6-testing)
  - [Known issues](#known-issues)
    - [Localtest reports that the app is not running even though it is](#localtest-reports-that-the-app-is-not-running-even-though-it-is)

### Prerequisites

1. .NET SDK matching your service.
2. Newest [Git](https://git-scm.com/downloads).
3. A code editor.
4. Docker or Podman.
5. `studioctl`

### Changing test data

In some cases your application might differ from the default setup and require custom changes to the
test data. Define your own test users in your **app** rather than editing the `testdata/` folder here:
put a `testData.json` in your app at `App/wwwroot/testData.json`, and Localtest will pick it up from
the running app.

```json
{
  "$schema": "https://altinncdn.no/schemas/json/test-users/test-users.schema.v1.json",
  "persons": [
    {
      "userId": 1337,
      "partyId": 501337,
      "ssn": "01039012345",
      "firstName": "Ola",
      "lastName": "Nordmann",
      "partyRoles": {}
    }
  ],
  "orgs": []
}
```

This keeps the test users next to the app that needs them, so they are version-controlled with the app
and shared with everyone working on it. The `$schema` line gives you completion and validation in an
editor with JSON schema support.

How Localtest combines the sources:

- If every app it can reach serves a `testData.json`, **only** those users are available — the built-in
  users (Ola Nordmann, Sofie Salt, …) are not. This is the usual case when you run a single app, and it
  means the file has to list every user you want to log in as, not just the ones you are adding.
- If any reachable app has no `testData.json`, the app-provided users are merged into the built-in ones.
  The merge only ever _adds_: an entry that already exists built-in keeps its built-in values. In
  particular you cannot grant an extra role to a built-in user this way — see
  [Add a missing role for a test user](#add-a-missing-role-for-a-test-user).
- Two apps may define the same user or party as long as the definitions are identical. Definitions that
  share an identifier but differ in any value are a conflict, and Localtest reports it rather than
  picking one.

Localtest caches the combined test data, so a change to `testData.json` takes a few seconds to show up
and can take up to 30 seconds under repeated page loads. You do not need to restart Localtest.

Since your file replaces the built-in users whenever every reachable app has one, start from them rather
than from scratch: `http://local.altinn.cloud:8000/Home/DebugUsers/LocalTestUsers` returns the built-in
test users already converted to the `testData.json` format, so you can copy the entries you need and
edit from there.
[`src/test/apps/signering-brukerstyrt/App/wwwroot/testData.json`](../../test/apps/signering-brukerstyrt/App/wwwroot/testData.json)
is a worked example in this repository.

The `testdata/` folder in this directory holds the built-in users and is baked into the Localtest image.
Changing it means changing this repository and rebuilding the image
(`STUDIOCTL_INTERNAL_DEV=true studioctl env up` from your checkout — see
[`src/cli/README.md`](../../cli/README.md)), so it is the right place only for changes that should apply
to everyone, not for one app's needs.

#### Add a missing role for a test user

Roles are set per user, per party, under `partyRoles` in your app's `testData.json`. The key is the
partyId of the entity the user represents, and the value is the list of roles they hold for it:

```json
{
  "userId": 20001,
  "partyId": 520001,
  "ssn": "01039012345",
  "firstName": "Ola",
  "lastName": "Nordmann",
  "partyRoles": {
    "500000": [{ "type": "Altinn", "value": "DAGL" }]
  }
}
```

Define the user **in full in your own file**, with an id of your own, rather than trying to add a role
to a built-in user such as 1337. Roles are merged per user id and only for users that do not already
exist built-in, so `partyRoles` you attach to a built-in user has no effect whenever the merge path is
in play; if the rest of your definition also differs from the built-in one, Localtest reports a conflict
instead. Users you define yourself are unaffected.

Save the file and reload the page to pick up the change.

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

Verify the app by opening `http://local.altinn.cloud:8000/<app-org-name>/<app-name>`.

If this is the case, open Windows PowerShell as administrator and run `OpenAppPortInHyperVFirewall.ps1` from the `scripts` folder.
