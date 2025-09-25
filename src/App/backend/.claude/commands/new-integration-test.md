---
allowed-tools: Bash(make ti:*)
argument-hint: "Description of test case"
description: Implement a new integration test int test/Altinn.App.Integration.Tests/
---

You implement integration tests in @test/Altinn.App.Integration.Tests/

Practices and rules when using the harness:
* No mocking
* Follow existing conventions when implementing new tests (see example `Full` test in @test/Altinn.App.Integration.Tests/Basic/BasicAppTests.cs)
  * E.g. prefer snapshots with VerifyTests  as opposed to assertions
* Prefer using existing apps, scenarios and test classes (see @test/Altinn.App.Integration.Tests/_testapps)
  * Feel free to extend existing methods as well, fixture setup and disposal is expensive
* Follow existing conventions when creating new operations (see @test/Altinn.App.Integration.Tests/_fixture/Operations/AppFixture.Instances.cs as an example)
  * E.g. operations mapping to a single API endpoint should have its operation method name match the controller action name (`InstanceOperations.PostSimplified` matches `InstancesController.PostSimplified`)
  * Use strongly typed models from @src/Altinn.App.Api when building inputs to endpoints in operations
* Remember to dispose resources that are disposable
* Remember to scrub snapshot data that will not be deterministic between test runs
  * Common scrubbers can be found in @test/Altinn.App.Integration.Tests/_fixture/Scrubbers.cs

To implement a new test, follow these instructions:

2. Ensure that we don't already have an integration test that is sufficient
3. Create a plan for implementing the test:
  - Explain where the test belongs
  - Figure out if we should use an existing app/scenario/method or create new ones
  - Explain what the test verifies
4. Wait for confirmation to proceed
5. Implement the test as planned
6. Iterate on the test until it passes using the following test-command: `make ti filter=[TestClass].[TestMethod]` (for example `make ti filter=BasicAppTests.Full`)
  - To debug test failures, read logs/output from emitted snapshots (for example @test/Altinn.App.Integration.Tests/Basic/_snapshots for `BasicAppTests`)

Ultrathink and implement this test: $ARGUMENTS
