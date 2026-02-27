using WorkflowEngine.Api.Utils;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Tests.Utils;

public class ValidationUtilsTests
{
    private static WorkflowRequest CreateWorkflowRequest(
        string workflowRef,
        IEnumerable<string>? dependsOnRefs = null
    ) =>
        new()
        {
            Ref = workflowRef,
            OperationId = $"op-{workflowRef}",
            IdempotencyKey = $"key-{workflowRef}",
            Type = WorkflowType.Generic,
            Steps = [new StepRequest { Command = new Command.Debug.Noop() }],
            DependsOn = dependsOnRefs?.Select(d => (WorkflowRef)d).ToList(),
        };

    // === ValidateAndSortWorkflowGraph ===

    [Fact]
    public void ValidateAndSort_EmptyBatch_ReturnsEmpty()
    {
        var result = ValidationUtils.ValidateAndSortWorkflowGraph([]);
        Assert.Empty(result);
    }

    [Fact]
    public void ValidateAndSort_SingleWorkflow_NoError()
    {
        var requests = new List<WorkflowRequest> { CreateWorkflowRequest("a") };

        var result = ValidationUtils.ValidateAndSortWorkflowGraph(requests);

        Assert.Single(result);
        Assert.Equal("a", result[0].Ref);
    }

    [Fact]
    public void ValidateAndSort_MultipleDisconnectedWorkflows_ReturnsAll()
    {
        var requests = new List<WorkflowRequest>
        {
            CreateWorkflowRequest("a"),
            CreateWorkflowRequest("b"),
            CreateWorkflowRequest("c"),
        };

        var result = ValidationUtils.ValidateAndSortWorkflowGraph(requests);

        Assert.Equal(3, result.Count);
        Assert.Equal(["a", "b", "c"], result.Select(r => r.Ref).Order());
    }

    [Fact]
    public void ValidateAndSort_DiamondDag_ReturnsSortedOrder()
    {
        // Diamond: a → b, a → c, b → d, c → d
        var requests = new List<WorkflowRequest>
        {
            CreateWorkflowRequest("b", ["a"]),
            CreateWorkflowRequest("d", ["b", "c"]),
            CreateWorkflowRequest("a"),
            CreateWorkflowRequest("c", ["a"]),
        };

        var result = ValidationUtils.ValidateAndSortWorkflowGraph(requests);

        Assert.Equal(4, result.Count);

        // 'a' must come first, 'd' must come last
        Assert.Equal("a", result[0].Ref);
        Assert.Equal("d", result[3].Ref);

        // 'b' and 'c' must both come after 'a' and before 'd'
        var middle = result.Skip(1).Take(2).Select(r => r.Ref).ToHashSet();
        Assert.Contains("b", middle);
        Assert.Contains("c", middle);
    }

    [Fact]
    public void ValidateAndSort_ExternalIdDependency_SkippedInGraphValidation()
    {
        // External DB IDs (IsId=true) should not participate in the in-batch topological sort
        var requests = new List<WorkflowRequest>
        {
            CreateWorkflowRequest("a") with
            {
                DependsOn = [99L],
            },
            CreateWorkflowRequest("b", ["a"]),
        };

        var result = ValidationUtils.ValidateAndSortWorkflowGraph(requests);

        Assert.Equal(2, result.Count);
        Assert.Equal("a", result[0].Ref);
        Assert.Equal("b", result[1].Ref);
    }

    [Fact]
    public void ValidateAndSort_MixedExternalIdAndRefDependencies_HandledCorrectly()
    {
        // "a" mixes an external DB ID (skipped) and a within-batch ref ("c") in the same DependsOn list.
        // Both the continue-branch and the graph-building branch must execute in the same inner loop.
        var requests = new List<WorkflowRequest>
        {
            CreateWorkflowRequest("c"),
            CreateWorkflowRequest("a") with
            {
                DependsOn = [99L, (WorkflowRef)"c"],
            },
            CreateWorkflowRequest("b", ["a"]),
        };

        var result = ValidationUtils.ValidateAndSortWorkflowGraph(requests);

        Assert.Equal(3, result.Count);
        Assert.Equal("c", result[0].Ref); // c has no in-batch deps, must come first
        Assert.Equal("a", result[1].Ref); // a depends on c, must come second
        Assert.Equal("b", result[2].Ref); // b depends on a, must come last
    }

    [Fact]
    public void ValidateAndSort_DuplicateRef_Throws()
    {
        var requests = new List<WorkflowRequest> { CreateWorkflowRequest("a"), CreateWorkflowRequest("a") };

        var ex = Assert.Throws<ArgumentException>(() => ValidationUtils.ValidateAndSortWorkflowGraph(requests));
        Assert.Contains("Duplicate ref 'a'", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateAndSort_UnknownDependsOnRef_Throws()
    {
        var requests = new List<WorkflowRequest> { CreateWorkflowRequest("a", ["nonexistent"]) };

        var ex = Assert.Throws<ArgumentException>(() => ValidationUtils.ValidateAndSortWorkflowGraph(requests));
        Assert.Contains("'nonexistent'", ex.Message, StringComparison.Ordinal);
        Assert.Contains("not present in the batch", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateAndSort_SelfReference_Throws()
    {
        var requests = new List<WorkflowRequest> { CreateWorkflowRequest("a", ["a"]) };

        var ex = Assert.Throws<ArgumentException>(() => ValidationUtils.ValidateAndSortWorkflowGraph(requests));
        Assert.Contains("self-reference", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndSort_Cycle_Throws()
    {
        // a → b → c → a
        var requests = new List<WorkflowRequest>
        {
            CreateWorkflowRequest("a", ["c"]),
            CreateWorkflowRequest("b", ["a"]),
            CreateWorkflowRequest("c", ["b"]),
        };

        var ex = Assert.Throws<ArgumentException>(() => ValidationUtils.ValidateAndSortWorkflowGraph(requests));
        Assert.Contains("cycle", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndSort_InvalidWorkflowInBatch_Throws()
    {
        // A workflow with no steps is invalid and should cause ValidateAndSort to throw
        var requests = new List<WorkflowRequest>
        {
            CreateWorkflowRequest("a"),
            new()
            {
                Ref = "b",
                OperationId = "op-b",
                IdempotencyKey = "key-b",
                Type = WorkflowType.Generic,
                Steps = [],
            },
        };

        var ex = Assert.Throws<ArgumentException>(() => ValidationUtils.ValidateAndSortWorkflowGraph(requests));
        Assert.Contains("'b' is invalid", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [MemberData(nameof(WorkflowRequestCases))]
    public void IsValidWorkflowRequest_Returns_ExpectedResult(WorkflowRequest request, ExpectedResult expected)
    {
        var result = ValidationUtils.IsValidWorkflowRequest(request);

        if (expected == ExpectedResult.Valid)
            Assert.True(result);
        else
            Assert.False(result);
    }

    [Theory]
    [MemberData(nameof(StepRequestCases))]
    public void IsValidStepRequest_Returns_ExpectedResult(StepRequest request, ExpectedResult expected)
    {
        var result = ValidationUtils.IsValidStepRequest(request);

        if (expected == ExpectedResult.Valid)
            Assert.True(result);
        else
            Assert.False(result);
    }

    public static TheoryData<WorkflowRequest, ExpectedResult> WorkflowRequestCases()
    {
        var validStep = new StepRequest { Command = new Command.Debug.Noop() };
        var validWorkflow = new WorkflowRequest
        {
            Ref = "wf",
            OperationId = "op",
            IdempotencyKey = "wf-key",
            Type = WorkflowType.Generic,
            Steps = [validStep],
        };

        return new TheoryData<WorkflowRequest, ExpectedResult>
        {
            // Valid cases
            { validWorkflow, ExpectedResult.Valid },
            { validWorkflow with { Metadata = null }, ExpectedResult.Valid },
            { validWorkflow with { Metadata = "{}" }, ExpectedResult.Valid },
            { validWorkflow with { Metadata = """{"key":"value"}""" }, ExpectedResult.Valid },
            {
                validWorkflow with
                {
                    Steps = [new StepRequest { Command = validStep.Command, Metadata = "{}" }],
                },
                ExpectedResult.Valid
            },
            // Invalid: Ref
            { validWorkflow with { Ref = "" }, ExpectedResult.Invalid },
            { validWorkflow with { Ref = "   " }, ExpectedResult.Invalid },
            // Invalid: OperationId
            { validWorkflow with { OperationId = "" }, ExpectedResult.Invalid },
            { validWorkflow with { OperationId = "   " }, ExpectedResult.Invalid },
            // Invalid: Metadata (non-null but not valid JSON)
            { validWorkflow with { Metadata = "not-json" }, ExpectedResult.Invalid },
            { validWorkflow with { Metadata = "{bad" }, ExpectedResult.Invalid },
            // Invalid: Steps
            { validWorkflow with { Steps = [] }, ExpectedResult.Invalid },
            // Invalid: a step has an empty command OperationId
            {
                validWorkflow with
                {
                    Steps = [new StepRequest { Command = new Command.AppCommand("") }],
                },
                ExpectedResult.Invalid
            },
            {
                validWorkflow with
                {
                    Steps = [new StepRequest { Command = new Command.AppCommand("   ") }],
                },
                ExpectedResult.Invalid
            },
            // Invalid: a step has invalid Metadata
            {
                validWorkflow with
                {
                    Steps = [new StepRequest { Command = validStep.Command, Metadata = "not-json" }],
                },
                ExpectedResult.Invalid
            },
        };
    }

    public static TheoryData<StepRequest, ExpectedResult> StepRequestCases()
    {
        var validCommand = new Command.Debug.Noop();

        return new TheoryData<StepRequest, ExpectedResult>
        {
            // Valid
            {
                new StepRequest { Command = validCommand },
                ExpectedResult.Valid
            },
            {
                new StepRequest { Command = validCommand, Metadata = null },
                ExpectedResult.Valid
            },
            {
                new StepRequest { Command = validCommand, Metadata = "{}" },
                ExpectedResult.Valid
            },
            {
                new StepRequest { Command = validCommand, Metadata = """{"key":"value"}""" },
                ExpectedResult.Valid
            },
            // Invalid: empty or whitespace command OperationId
            {
                new StepRequest { Command = new Command.AppCommand("") },
                ExpectedResult.Invalid
            },
            {
                new StepRequest { Command = new Command.AppCommand("   ") },
                ExpectedResult.Invalid
            },
            // Invalid: non-null Metadata that is not valid JSON
            {
                new StepRequest { Command = validCommand, Metadata = "not-json" },
                ExpectedResult.Invalid
            },
            {
                new StepRequest { Command = validCommand, Metadata = "{bad" },
                ExpectedResult.Invalid
            },
        };
    }

    public enum ExpectedResult
    {
        Valid,
        Invalid,
    }

    // === HasAppCommandSteps ===

    public static TheoryData<IReadOnlyList<WorkflowRequest>, bool> HasAppCommandStepsCases()
    {
        var noopStep = new StepRequest { Command = new Command.Debug.Noop() };
        var webhookStep = new StepRequest { Command = new Command.Webhook("https://example.com") };
        var appStep = new StepRequest { Command = new Command.AppCommand("cmd") };

        WorkflowRequest Wf(params StepRequest[] steps) =>
            new()
            {
                Ref = "wf",
                OperationId = "op",
                IdempotencyKey = "wf-key",
                Type = WorkflowType.Generic,
                Steps = steps,
            };

        return new TheoryData<IReadOnlyList<WorkflowRequest>, bool>
        {
            { [], false },
            { [Wf(noopStep)], false },
            { [Wf(webhookStep)], false },
            { [Wf(noopStep, webhookStep)], false },
            { [Wf(appStep)], true },
            { [Wf(noopStep, appStep)], true },
            { [Wf(noopStep), Wf(appStep)], true }, // AppCommand in second workflow
            { [Wf(appStep), Wf(noopStep)], true }, // AppCommand in first workflow
            { [Wf(noopStep), Wf(webhookStep)], false }, // Neither has AppCommand
        };
    }

    [Theory]
    [MemberData(nameof(HasAppCommandStepsCases))]
    public void HasAppCommandSteps_Returns_ExpectedResult(IReadOnlyList<WorkflowRequest> requests, bool expected)
    {
        var result = ValidationUtils.HasAppCommandSteps(requests);
        Assert.Equal(expected, result);
    }
}
