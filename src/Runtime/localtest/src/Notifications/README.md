# Notifications

Localtest's Notifications emulation copies code from
[altinn-notifications](https://github.com/Altinn/altinn-notifications). When you copy more of it:

- Copy core code as it is.
- Copy controllers, and adapt their authorization, since local requests carry no platform access token.
- Do not copy persistence. Write a repository that stores the data on disk instead.
- Register new services in `Startup.cs`.
