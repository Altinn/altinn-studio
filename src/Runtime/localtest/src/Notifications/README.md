# Notifications

Localtest's Notifications emulation copies code from
[altinn-notifications](https://github.com/Altinn/altinn-notifications), as
[Code copied from the platform services](../../README.md#code-copied-from-the-platform-services) describes. When you
copy more of it:

- Adapt the authorization of the controllers, since local requests carry no platform access token.
- Register new services in `Startup.cs`.
