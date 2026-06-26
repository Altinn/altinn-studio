using System;
using System.Collections.Generic;
using System.IO;
using Altinn.WorkflowEngine.ContractTesting;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.App.Tests.Contract;

/// <summary>
/// Owns the canonical wire-contract description. This test reflects over the engine's real DTO types
/// (the single source of truth for the workflow-engine HTTP contract) and asserts they still match the
/// committed <c>wire-contract.verified.json</c>.
///
/// When the engine intentionally changes the contract, regenerate the snapshot by running this test
/// once with the environment variable <c>UPDATE_WIRE_CONTRACT=1</c>, then review and commit the diff.
/// The committed file is what the app-side contract test (in Altinn.App.Core.Tests) verifies against,
/// so any engine contract change surfaces in both repositories' test suites.
/// </summary>
public class EngineWireContractTests
{
    private static readonly string _snapshotPath = Path.Combine(
        WireContract.ContractDirectory(),
        "wire-contract.verified.json"
    );

    /// <summary>
    /// The set of types that make up the engine's HTTP wire contract with Altinn apps: enqueue
    /// requests, status/collection responses, retry configuration, and the AppCommand callback shapes.
    /// Nested object types (e.g. WorkflowResult, CommandDetails, CollectionHeadStatus) are discovered
    /// automatically by the describer, so only the entry points are listed here.
    /// </summary>
    private static IReadOnlyList<Type> EngineContractTypes =>
        [
            // Enqueue request graph
            typeof(WorkflowEnqueueRequest),
            typeof(WorkflowRequest),
            typeof(StepRequest),
            typeof(CommandDefinition),
            typeof(RetryStrategy),
            // Enqueue response
            typeof(WorkflowEnqueueResponse.Accepted),
            // Status + collection responses
            typeof(WorkflowStatusResponse),
            typeof(StepStatusResponse),
            typeof(PaginatedResponse<WorkflowStatusResponse>),
            typeof(WorkflowCollectionDetailResponse),
            typeof(CancelWorkflowResponse),
            typeof(ResumeWorkflowResponse),
            // AppCommand callback contract (owned by the engine host)
            typeof(Actor),
            typeof(AppCommandData),
            typeof(AppWorkflowContext),
            typeof(AppCallbackPayload),
            typeof(AppCallbackResponse),
        ];

    [Fact]
    public void EngineContract_MatchesCommittedSnapshot()
    {
        var actual = WireContract.Serialize(WireContract.Describe(EngineContractTypes));

        if (Environment.GetEnvironmentVariable("UPDATE_WIRE_CONTRACT") == "1")
        {
            File.WriteAllText(_snapshotPath, actual);
        }

        Assert.True(
            File.Exists(_snapshotPath),
            $"Missing wire contract snapshot at '{_snapshotPath}'. Generate it by running this test with UPDATE_WIRE_CONTRACT=1."
        );

        var expected = File.ReadAllText(_snapshotPath);
        Assert.Equal(Normalize(expected), Normalize(actual));
    }

    private static string Normalize(string value) => value.Replace("\r\n", "\n", StringComparison.Ordinal).Trim();
}
