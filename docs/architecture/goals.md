# Architecture goals

The goals we weigh every design in Altinn Studio against. An ADR that goes against one says why. They apply
Digdir's [architecture principles][digdir-principles] to Altinn Studio.

Altinn 1 and Altinn 2 were rebuilt because they depended on proprietary products that reached end of life
([Altinn and open source][altinn-oss]).

## Open standards and protocols

- Prefer a published open standard over our own format or a vendor's.
- APIs: OpenAPI, with errors as RFC 9457 Problem Details ([decision-log#4][dl4], [decision-log#37][dl37]).
- Identity: OAuth 2.0 and OpenID Connect, through ID-porten and Maskinporten.
- Processes: BPMN 2.0. Policies: XACML 3.0. Events: CloudEvents. Telemetry: OpenTelemetry ([decision-log#3][dl3]).
- Extend a standard only in the ways it allows.

## Minimize dependencies

- A dependency has to clearly earn its place.
- Adding one brings code into Altinn Studio without taking any responsibility out. We answer for its bugs,
  vulnerabilities and upgrades, and we know it less well than our own code.
- Look to the standard library and the platform first ([decision-log#3][dl3]).
- What we do take on is open source, permissively licensed and actively maintained.
- Images contain only what runs ([decision-log#42][dl42]).
- This applies to services and tools as well as libraries.

## Vendor independence and digital sovereignty

- We can move to another cloud provider, or to our own data centers, without rebuilding.
- Use a provider's service only behind a standard interface or a boundary we own, such as PostgreSQL, OTLP or the
  Kubernetes API.
- Behavior does not depend on a provider's product ([decision-log#31][dl31]).
- An ADR that adds a provider dependency says what leaving would take.
- Background: the [national digitalisation strategy][dns], the Skate report [Skiftende skydekke][skate], and the
  [EU Cloud Sovereignty Framework][eu-csf].

## Open source

- MIT licensed, a [Digital Public Good][dpg], developed in the open ([Digdir principle 6][digdir-6]).

## Isolation

- Each service owner's apps and data are kept apart from every other service owner's.

## Security in depth

- Every component authenticates and authorizes each request, wherever it comes from.
- Workloads have their own identity instead of static secrets ([decision-log#11][dl11]).

## Accessibility and privacy

- Designer and apps meet the [universal design regulation][uu] (WCAG 2.1 AA).
- Privacy by design and by default ([GDPR article 25][gdpr25]).

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
