using WorkflowEngine.Core.Utils;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests.Utils;

public class ValidationUtilsTests
{
    private static CommandDefinition NoopCommand() => new() { Type = "noop" };

    private static WorkflowRequest CreateWorkflowRequest(
        string workflowRef,
        IEnumerable<string>? dependsOnRefs = null
    ) =>
        new()
        {
            Ref = workflowRef,
            OperationId = $"op-{workflowRef}",
            Steps = [new StepRequest { OperationId = "noop", Command = NoopCommand() }],
            DependsOn = dependsOnRefs?.Select(d => (WorkflowRef)d).ToList(),
        };

    // === ValidateWorkflowGraph ===

    [Fact]
    public void Validate_EmptyBatch_DoesNotThrow()
    {
        ValidationUtils.ValidateWorkflowGraph([]);
    }

    [Fact]
    public void Validate_SingleWorkflow_DoesNotThrow()
    {
        ValidationUtils.ValidateWorkflowGraph([CreateWorkflowRequest("a")]);
    }

    [Fact]
    public void Validate_MultipleDisconnectedWorkflows_DoesNotThrow()
    {
        ValidationUtils.ValidateWorkflowGraph([
            CreateWorkflowRequest("a"),
            CreateWorkflowRequest("b"),
            CreateWorkflowRequest("c"),
        ]);
    }

    [Fact]
    public void Validate_DiamondDag_DoesNotThrow()
    {
        // Diamond: a → b, a → c, b → d, c → d. Listed out of dependency order to ensure Kahn's
        // cycle detection handles fan-out + fan-in without false-positive cycle reports.
        ValidationUtils.ValidateWorkflowGraph([
            CreateWorkflowRequest("b", ["a"]),
            CreateWorkflowRequest("d", ["b", "c"]),
            CreateWorkflowRequest("a"),
            CreateWorkflowRequest("c", ["a"]),
        ]);
    }

    [Fact]
    public void Validate_ExternalIdDependency_DoesNotThrow()
    {
        // External DB IDs (IsId=true) should not participate in in-batch graph validation
        ValidationUtils.ValidateWorkflowGraph([
            CreateWorkflowRequest("a") with
            {
                DependsOn = [Guid.NewGuid()],
            },
            CreateWorkflowRequest("b", ["a"]),
        ]);
    }

    [Fact]
    public void Validate_MixedExternalIdAndRefDependencies_DoesNotThrow()
    {
        // "a" mixes an external DB ID (skipped) and a within-batch ref ("c") in the same DependsOn list.
        // Both the continue-branch and the graph-building branch must execute in the same inner loop.
        ValidationUtils.ValidateWorkflowGraph([
            CreateWorkflowRequest("c"),
            CreateWorkflowRequest("a") with
            {
                DependsOn = [Guid.NewGuid(), (WorkflowRef)"c"],
            },
            CreateWorkflowRequest("b", ["a"]),
        ]);
    }

    [Fact]
    public void Validate_DuplicateRef_Throws()
    {
        var requests = new List<WorkflowRequest> { CreateWorkflowRequest("a"), CreateWorkflowRequest("a") };

        var ex = Assert.Throws<ArgumentException>(() => ValidationUtils.ValidateWorkflowGraph(requests));
        Assert.Contains("Duplicate ref 'a'", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_UnknownDependsOnRef_Throws()
    {
        var requests = new List<WorkflowRequest> { CreateWorkflowRequest("a", ["nonexistent"]) };

        var ex = Assert.Throws<ArgumentException>(() => ValidationUtils.ValidateWorkflowGraph(requests));
        Assert.Contains("'nonexistent'", ex.Message, StringComparison.Ordinal);
        Assert.Contains("not present in the batch", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_SelfReference_Throws()
    {
        var requests = new List<WorkflowRequest> { CreateWorkflowRequest("a", ["a"]) };

        var ex = Assert.Throws<ArgumentException>(() => ValidationUtils.ValidateWorkflowGraph(requests));
        Assert.Contains("self-reference", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_Cycle_Throws()
    {
        // a → b → c → a
        var requests = new List<WorkflowRequest>
        {
            CreateWorkflowRequest("a", ["c"]),
            CreateWorkflowRequest("b", ["a"]),
            CreateWorkflowRequest("c", ["b"]),
        };

        var ex = Assert.Throws<ArgumentException>(() => ValidationUtils.ValidateWorkflowGraph(requests));
        Assert.Contains("cycle", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_NullRefs_NoDependencies_DoesNotThrow()
    {
        ValidationUtils.ValidateWorkflowGraph([
            CreateWorkflowRequest("a") with
            {
                Ref = null,
            },
            CreateWorkflowRequest("b") with
            {
                Ref = null,
            },
        ]);
    }

    [Fact]
    public void Validate_MixedNullAndNonNullRefs_WithDependency_DoesNotThrow()
    {
        // Workflow at index 1 (null ref) depends on "a" which has a ref
        ValidationUtils.ValidateWorkflowGraph([
            CreateWorkflowRequest("a"),
            CreateWorkflowRequest("b") with
            {
                Ref = null,
                DependsOn = [(WorkflowRef)"a"],
            },
        ]);
    }

    [Fact]
    public void Validate_NullRefWorkflow_WithExternalIdDependency_DoesNotThrow()
    {
        // A workflow without a ref can still depend on external DB IDs
        ValidationUtils.ValidateWorkflowGraph([
            CreateWorkflowRequest("a") with
            {
                Ref = null,
                DependsOn = [Guid.NewGuid()],
            },
        ]);
    }

    [Fact]
    public void Validate_InvalidWorkflowInBatch_Throws()
    {
        // A workflow with no steps is invalid and should cause Validate to throw
        var requests = new List<WorkflowRequest>
        {
            CreateWorkflowRequest("a"),
            new()
            {
                Ref = "b",
                OperationId = "op-b",
                Steps = [],
            },
        };

        var ex = Assert.Throws<ArgumentException>(() => ValidationUtils.ValidateWorkflowGraph(requests));
        Assert.Contains("(b) is invalid", ex.Message, StringComparison.OrdinalIgnoreCase);
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
        var validStep = new StepRequest
        {
            OperationId = "noop",
            Command = new CommandDefinition { Type = "noop" },
        };
        var validWorkflow = new WorkflowRequest { OperationId = "op", Steps = [validStep] };

        return new TheoryData<WorkflowRequest, ExpectedResult>
        {
            // Valid cases
            { validWorkflow, ExpectedResult.Valid },
            {
                validWorkflow with
                {
                    Steps =
                    [
                        new StepRequest
                        {
                            OperationId = "noop",
                            Command = validStep.Command,
                            Labels = new Dictionary<string, string> { ["key"] = "value" },
                        },
                    ],
                },
                ExpectedResult.Valid
            },
            // Valid: Ref is optional
            { validWorkflow with { Ref = null }, ExpectedResult.Valid },
            // Invalid: OperationId
            { validWorkflow with { OperationId = "" }, ExpectedResult.Invalid },
            { validWorkflow with { OperationId = "   " }, ExpectedResult.Invalid },
            // Invalid: Steps
            { validWorkflow with { Steps = [] }, ExpectedResult.Invalid },
            // Invalid: a step has an empty OperationId
            {
                validWorkflow with
                {
                    Steps =
                    [
                        new StepRequest
                        {
                            OperationId = "",
                            Command = new CommandDefinition { Type = "app" },
                        },
                    ],
                },
                ExpectedResult.Invalid
            },
            {
                validWorkflow with
                {
                    Steps =
                    [
                        new StepRequest
                        {
                            OperationId = "   ",
                            Command = new CommandDefinition { Type = "app" },
                        },
                    ],
                },
                ExpectedResult.Invalid
            },
        };
    }

    public static TheoryData<StepRequest, ExpectedResult> StepRequestCases()
    {
        var validCommand = new CommandDefinition { Type = "noop" };

        return new TheoryData<StepRequest, ExpectedResult>
        {
            // Valid
            {
                new StepRequest { OperationId = "noop", Command = validCommand },
                ExpectedResult.Valid
            },
            {
                new StepRequest
                {
                    OperationId = "noop",
                    Command = validCommand,
                    Labels = null,
                },
                ExpectedResult.Valid
            },
            {
                new StepRequest
                {
                    OperationId = "noop",
                    Command = validCommand,
                    Labels = new Dictionary<string, string>(),
                },
                ExpectedResult.Valid
            },
            {
                new StepRequest
                {
                    OperationId = "noop",
                    Command = validCommand,
                    Labels = new Dictionary<string, string> { ["key"] = "value" },
                },
                ExpectedResult.Valid
            },
            // Invalid: empty or whitespace OperationId
            {
                new StepRequest
                {
                    OperationId = "",
                    Command = new CommandDefinition { Type = "app" },
                },
                ExpectedResult.Invalid
            },
            {
                new StepRequest
                {
                    OperationId = "   ",
                    Command = new CommandDefinition { Type = "app" },
                },
                ExpectedResult.Invalid
            },
        };
    }

    public enum ExpectedResult
    {
        Valid,
        Invalid,
    }
}
