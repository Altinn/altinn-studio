# New way of getting code lists

* Status: Accepted
* Deciders: Squad Data
* Date: 2025-12-09

## Result

A1: Use already existing path without modifying it

## Problem context

We want to be able to get Altinn 3 library code lists through the API directly without registering the provider in
the app startup as is currently required for code lists.

The endpoints we currently have for getting code lists take an optionId, queryParams and preferred language as input. Where
the optionId is a random string value chosen for the particular code list through configuration in the app startup.
Instead we want to be able to fetch code lists directly without having to decide which code list to fetch
beforehand by configuring it in the app startup.

Other things that would be nice to solve at the same time:
* Support for filtering/grouping of code lists
* Clean up APIs
  * Object, not list as root for added metadata support
  * Avoid the need to distinguish between `"secure": true/false` in frontend
* See if we can improve the way we register existing code lists
* Improve AppOptionsFactory and InstanceAppOptionsFactory in backend

## Decision drivers

* B1: Keep complexity low for developers
* B2: Prevent confusion between optionId and "optionId" parsed to org, code list id and version
* B3: Performance, consider parsing overhead of different approaches

## Alternatives considered

* **A1: Use already existing path without modifying it**
  *GET /{org}/{app}/api/options/{optionsIdOrLibraryRef}?language={language}*
  OptionsId becomes the creator org, code list id and version. Formatting creator org, code list id and version into the optionsId string e.g., `lib**{creatorOrg}**{codeListId}**{version}`
* **A2: Modify existing path with nullable path variables**
  *GET /{org}/{app}/api/options/{optionIdOrCreatorOrg}/
  {codeListId?}/{version?}&language={language}*
  Supports receiving both just optionId or a creatorOrg, codeListId and version combination.
* **A3: Modify existing path with new query parameters**
  *GET /{org}/{app}/api/options/{optionsIdOrCodeListId}?creatorOrg={org}&version={version}&language={language}*
  optionsIdOrCodeListId becomes the codeListId
* **A4: Modify existing path so that option id is wild card path segment**
  *GET /{org}/{app}/api/options/{\*\*optionsIdOrLibraryRef}&language={language}*
  OptionId is now allowed to contain slashes, and can be formated as /{org}/{codeListId}/{version}
* **A5: Add a new endpoint /{creatorOrg}/{codeListId}?version={version}**

## Pros and cons

### A1: Use already existing path without modifying it

* Pros
  * Less work required in the frontend?
* Cons
  * Increased complexity since the endpoint now has to encode what is sent in as "optionId" to creator org, code list id and version.
  * Can potentially cause confusion between what is an actual optionId and what is not.
  * String parsing complexity, what should be encoded as optionId and what should not be.
  * Difficult to determine a format for optionsId that consists of creator org, code list id and version that doesn't conflict with actual optionsIds
  * If creator org, code list id and version contains special characters (hyphens, dots, etc.), the delimiter choice becomes problematic.
  * Everything is string; framework can't validate individual components.

### A2: Modify existing path with nullable path variables

* Pros
  * Supports B1; no custom parsing of "optionId" will help maintain a lower complexity.
  * Supports framework validation, each path segment validated separately by routing.
  * Tools can generate clearer API docs showing both usage patterns
  * RESTful design, clear resource hierarchy in URL path
  * Supports B2 and B3
* Cons
  * Can potentially cause confusion on when certain fields must be provided.
  * Doesn't  seem possible for optional path parameters out of the box in Swagger, all path parameters are required. This
  makes it impossible to call the endpoint the old way with just optionsId through Swagger.
  Swagger complains about required parameters missing
  * Route ambiguity, /options/something could match either pattern. So some custom validation will be required.

### A3: Modify existing path with new query parameters

* Pros
  * Clear semantic distinction via source parameter.
  * Supports B2 and B3
* Cons
  * Can potentially cause confusion on when certain fields must be provided.
  * REST anti-pattern, resource identifiers (creator org, code list id) should be in path, not query string

### A4: Modify existing path so that option id is wild card path segment

* Pros
  * We know that optionsIds never contains slashes. So we can confidently say that
  optionIds containing slashes is library code references
* Cons
  * Route conflicts, wild card can accidentally catch routes you didn't intend.
  * Breaking rest conventions, path parameters should be single identifiers, not composite structures.
  * Poor discoverability, API consumers can't easily tell from the OpenAPI/Swagger docs what format optionsId should be.

### A5: Add a new endpoint /{creatorOrg}/{codeListId}?version={version}

* Pros
  * Easy to document which path parameters that is required in Swagger.
  * It is also easy to document the different responses for the two endpoints.
  * Supports B1; no custom parsing of "optionId" will help maintain a lower complexity.
  * Support B2 and B3
* Cons
  * Will require a new endpoint which was something we initially didn't want.

## Decision rationale

To ease the implementation process for the consumers/clients, we have chosen A1.
The format for Altinn 3 library code list optionIds is:

`lib**{creatorOrg}**{codeListId}**{version}`
