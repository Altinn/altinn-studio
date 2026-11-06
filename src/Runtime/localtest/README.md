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

### Access packages

Persons in `testData.json` can hold access packages ("tilgangspakker") for a party, under `accessPackages` keyed by
party id, and system users can hold them for their own organization. A package is its identifier, such as `lonn`, or
its URN, `urn:altinn:accesspackage:lonn`. When an app policy has rules on `urn:altinn:accesspackage`, the PDP adds
the packages the subject holds for the resource party, as the platform does, so those rules decide the same way
locally. A sub-unit, an organization with a `parentPartyId`, gets the packages held for its main unit. Packages held
for the person's own party give no access to other parties. `enduser/authorizedparties` lists the packages and role
codes per party. Caller-supplied `urn:altinn:accesspackage` subject attributes are ignored.

In the built-in data, Pengelens Partner holds `regnskapsforer-med-signeringsrettighet` and `lonn` for DDG Fitness, and
so does the system user of Oslos Vakreste Borettslag. A user's packages are in `accesspackages.json` next to their
`roles.json`, and a system user's are in its `AccessPackages`.

A role also gives the packages Access Management gives for it in the platform, so daglig leder (`DAGL`) of an
organization holds most of its packages, and privatperson (`PRIV`) the `innbygger-*` packages for the person's own
party. Every person holds `PRIV` for their own party, also when `partyRoles` does not list it, as the platform gives it
to every person in the register; self-identified users do not. The mapping is generated from the static data of Access Management, as
[`scripts/generate_role_packages.py`](scripts/generate_role_packages.py) describes, and it
differs from the platform in these ways:

- It is a copy, so it goes stale when Access Management changes its mapping until someone regenerates it.
- A role is matched by its code or Altinn 2 code. Altinn 2 roles such as `A0239` give no packages, as in the
  platform, where the CCR role `REGN` gives the accountant packages.
- Packages that a role gives only for some kinds of organization need the organization's `unitType` in the test data.
- Packages that come through client delegation or from another party are not emulated.

When the app policy does not apply to a system user, Localtest still permits the actions the test data gives it,
whatever the resource party, so that apps without system user rules can be tested with one.
