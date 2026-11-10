# App-file JSON parsing proposal

This implementation proposal makes comments and trailing commas work consistently in app configuration.
It is for local review before publication. It does not change JSON accepted in API request bodies or external responses.

An app file can pass startup validation and then fail when a consumer reads it. Examples include schemas and rules
in form bootstrap, footer configuration in global bootstrap, text files during language discovery, and asset manifests
when generating HTML. The runtime already deliberately accepts both extensions for layouts, settings and options.

## Proposed contract

App configuration accepts ordinary JSON, line comments, block comments and trailing commas in arrays and objects.
Startup validation and downstream consumers use that grammar. Accepting this syntax does not bypass deserialization
or model validation. Naming rules, converters, case sensitivity and number handling remain specific to each consumer.

The policy covers app-wide and task settings, layouts, metadata, model schemas, validation and calculation rules,
texts, options, footer configuration, frontend assets and prefill configuration. It applies when a custom
`IAppResources` implementation supplies configuration too.

`AppFileJson` supplies document options and a serializer-options factory. The factory copies the consumer's existing
options and adds the two syntax allowances. It does not use the broader Web defaults or enum converter from
`JsonSerializerPermissive`. Existing Newtonsoft layout aggregation stays in place.

Metadata analysis and source generation must accept the same files as the runtime. The analyzer's small JSON reader
skips comments in place so diagnostic locations still refer to the original source. Its document-completion check
accepts trailing comments and continues to reject another value or an unfinished comment.

## Resource contents and diagnostics

The loader still stores original UTF-8 contents after removing a leading byte order mark. Raw resource getters and
endpoints keep their existing behavior. The frontend receives parsed objects through bootstrap, serialized as
ordinary JSON. A raw resource endpoint can still return comments and trailing commas. A client of that endpoint
must understand the app-file grammar if it parses the response.

The loader retains aggregated errors with relative filenames and original line and byte positions. Invalid development
reloads keep the preceding snapshot. This proposal preserves existing downstream deserialization error behavior.
Adding consistent filename context to errors from custom resource implementations remains a possible follow-up.

Normalizing every file at ingestion would let consumers parse strictly, but replacing stored bytes would change raw
resource responses and move subsequent error positions away from the source. Keeping both representations would
avoid that change, at the cost of another storage and access contract. Neither option covers custom resource providers
on its own. Sharing the grammar is the smaller compatibility change, but each new consumer must opt into it.

## Local tooling

`studioctl` also reads application metadata to identify an app before starting it. Its Go reader must accept these
extensions for commented metadata to work in the normal localtest workflow. The proposal uses `hujson` to standardize
an in-memory copy before ordinary Go JSON deserialization, rather than maintaining another handwritten JSON parser.
It removes a leading UTF-8 BOM without changing the file on disk.

This adds one Go dependency and requires a coordinated studioctl update for local development and CI. Older studioctl
versions still reject commented metadata even with the updated backend. Upgrade migrations and Designer authoring
tools need their own compatibility audit before extending this guarantee to every tool that edits app files.

## Verification

Backend tests exercise plain JSON, comments alone, trailing commas alone and both together through the real file loader
and resource services. They verify metadata, settings, layouts, options, languages, text, asset tags, BOM handling,
raw-content preservation and source error positions. Bootstrap tests verify schema and rule objects can be serialized
for a strict browser JSON parser. Calculation and validation tests assert evaluated results. Analyzer tests cover
comments around tokens, source offsets, trailing comments and malformed input.

The in-repo `frontend-test` app contains both syntax extensions in its consumed configuration files, including nested
rules. The `json-app-files.ts` Cypress spec uses real authentication, instance creation and task navigation. Its
intercepts only observe responses. It checks rendered schema validation, languages, footer links, asset execution,
translated options and expression validation, then reads calculated data back from the backend and reloads the form.
The existing stateless query-parameter test exercises a real prefill file containing both extensions.

Run the affected Cypress specs against localtest with retries disabled:

```sh
yarn cy:run:localtest --spec 'test/e2e/integration/frontend-test/json-app-files.ts,test/e2e/integration/frontend-test/calculations.ts,test/e2e/integration/frontend-test/footer.ts,test/e2e/integration/stateless-app/instantiate-from-query-params.ts' --config retries=0
```

The frontend-test fixture must be started with the updated studioctl build. The frontend and both test apps must use
this checkout's code. Backend verification uses the main solution tests plus analyzer and source-generator suites.
The CLI reader has tests for accepted syntax, unchanged source files and malformed input.

## Review and publication

The review decision is whether a shared grammar, original resource contents and an additional CLI dependency are an
acceptable compatibility contract. Comments in metadata and trailing commas in backend calculations extend support
that was previously inconsistent. Existing valid files keep their values and behavior.

The proposal does not include the task UI field fixes in PR #21825 or eFormidling behavior changes. Before publishing,
document the supported syntax in docs.altinn.studio, audit upgrade and authoring tools as needed, and add issue or PR
references to the release notes. No public API signature changes are required.
