# Shared expression tests

The JSON tests for expressions that both the App frontend and the App backend run, so that their implementations
agree. `evaluation` tests expression functions, contexts, invalid input and layout preprocessing. `validation` tests
expression validation.

A test with `disabledFrontend: true` or `disabledBackend: true` marks a known difference between the two. Remove the
marker when they agree. `evaluation/functions/gatewayAction/frontend-unavailable.json` is not a difference. It checks
that the frontend stub throws, and the backend, which supports the function, skips it.

The backend's [runner](../../App/backend/test/Altinn.App.Core.Tests/LayoutExpressions/CommonTests/TestFunctions.cs)
also skips whole function folders: functions the backend has not implemented yet, and functions that stay
frontend-only because they depend on frontend state or navigation, or are experimental. A test there fails
when a function folder has neither a backend test nor a place in those lists.
