# Localtest

Localtest emulates the Altinn platform services that apps call, so that an app runs on a developer's machine without
the cloud platform. [studioctl](../../cli/README.md) runs it in a container with `studioctl env up`, at
`http://local.altinn.cloud:8000`. The emulation should follow the platform contracts that apps depend on, so that an
app behaves the same locally as in the cloud.

studioctl runs the newest Localtest image and supplies its configuration.
[Images the local environment runs](../README.md#images-the-local-environment-runs) says what a change to that
configuration must keep working.

- [Correspondence](docs/correspondence.md) covers the emulated Correspondence API and the Messages page.
- [Notifications](src/Notifications/README.md) covers how the Notifications emulation is copied from the real service.

## Test data

The built-in test users are in [`testdata/`](testdata), and the Localtest image includes them. App developers define
the users their app needs in its
[`testData.json`](https://docs.altinn.studio/altinn-studio/v8/reference/testing/local/testusers/#app-specific-users).
Change `testdata/` only for what applies to everyone, then rebuild the image with
`STUDIOCTL_INTERNAL_DEV=true studioctl env up` from your checkout.
