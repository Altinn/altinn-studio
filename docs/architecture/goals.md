# Architecture goals

We weigh every design in Altinn Studio against these goals, applying Digdir's
[architecture principles][digdir-principles] to Altinn Studio. An ADR that goes against a goal says why.

Altinn 1 and Altinn 2 were rebuilt because they depended on proprietary products that reached end of life
([Altinn and open source][altinn-oss]).

## Open standards and protocols

We choose published open standards over our own formats or a vendor's, and extend a standard only in the ways it allows.

- APIs use OpenAPI, with errors as RFC 9457 Problem Details ([decision-log#4][dl4], [decision-log#37][dl37]).
- Identity uses OAuth 2.0 and OpenID Connect, through ID-porten and Maskinporten.
- Processes use BPMN 2.0, policies use XACML 3.0 and events use CloudEvents.
- Telemetry uses OpenTelemetry ([decision-log#3][dl3]).

## Minimal dependencies

A dependency, whether a library, a service or a tool, has to earn its place. It adds code we have to debug, patch and
upgrade without controlling its direction. Every third-party dependency is a compromise, and even one that fits today
can drift as its maintainers and priorities change.

- We look to the standard library and the platform first ([decision-log#3][dl3]).
- Dependencies we take on are open source, permissively licensed and actively maintained.
- Container images hold only what runs ([decision-log#42][dl42]).

## Vendor independence and digital sovereignty

Altinn Studio can move to another cloud provider, or to our own data centers, without rebuilding.

- Any provider service sits behind a standard interface or a boundary we own, such as PostgreSQL, OTLP or the
  Kubernetes API.
- Our APIs and services do not depend on a provider's product features or contracts ([decision-log#31][dl31]).
- An ADR that adds a provider dependency says what leaving would take.

Background: the [national digitalization strategy][dns], the Skate report [Skiftende skydekke][skate] and the
[EU Cloud Sovereignty Framework][eu-csf].

## Open source

Altinn Studio is licensed under the MIT License and developed in the open as a [Digital Public Good][dpg]
([Digdir principle 6][digdir-6]).

- Code, documentation and architectural decisions stay public by default, keeping only secrets and sensitive
  operational details private.
- Developers can build, test and run components locally without proprietary dependencies.

## Isolation

Altinn Studio isolates each service owner's apps and data from every other service owner's.

- Each service owner runs its apps in its own [runtime cluster](../infrastructure/environments.md#runtime-clusters).
- Shared services and databases isolate each service owner's data and traffic so a bug, load spike or compromise in one
  app does not expose or disrupt another service owner.

## Security in depth

- Every component authenticates and authorizes each request, wherever it comes from, rather than trusting the network.
- Workloads use their own short-lived identity instead of static secrets ([decision-log#11][dl11]).
- Services and containers run with least privilege.

## Accessibility

- Designer and apps meet the [universal design regulation][uu] (WCAG 2.1 AA).
- Interfaces work with keyboards and assistive technology by default, not as a follow-up fix.

## Privacy

- Components collect and retain only the personal data a task requires, following privacy by design and by default
  ([GDPR article 25][gdpr25]).
- Services keep personal and other [sensitive data](../observability.md#sensitive-data) out of logs, metrics and traces.

[digdir-principles]: https://www.digdir.no/digital-samhandling/overordnede-arkitekturprinsipper/1065
[digdir-6]: https://www.digdir.no/digital-samhandling/prinsipp-6-lag-digitale-losninger-som-stotter-samhandling/1063
[altinn-oss]: https://docs.altinn.studio/en/community/about/open-source/
[dl3]: https://github.com/Altinn/altinn-decision-log/issues/3
[dl4]: https://github.com/Altinn/altinn-decision-log/issues/4
[dl11]: https://github.com/Altinn/altinn-decision-log/issues/11
[dl31]: https://github.com/Altinn/altinn-decision-log/issues/31
[dl37]: https://github.com/Altinn/altinn-decision-log/issues/37
[dl42]: https://github.com/Altinn/altinn-decision-log/issues/42
[dns]: https://www.regjeringen.no/en/documents/the-digital-norway-of-the-future/id3054645/
[skate]: https://www.digdir.no/digitalisering-og-samordning/skiftende-skydekke/8337
[eu-csf]: https://commission.europa.eu/news-and-media/news/sovereign-cloud-framework-explained-2026-06-01_en
[dpg]: https://www.digitalpublicgoods.net/r/altinn
[uu]: https://lovdata.no/dokument/SF/forskrift/2013-06-21-732
[gdpr25]: https://lovdata.no/lov/2018-06-15-38/gdpr/a25
