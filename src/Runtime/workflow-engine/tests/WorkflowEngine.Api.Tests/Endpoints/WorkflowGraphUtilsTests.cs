using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Utils;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Tests.Endpoints;

public class WorkflowGraphUtilsTests
{
    private static WorkflowRequest MakeRequest(string @ref, params string[] dependsOn) =>
        new()
        {
            Ref = @ref,
            OperationId = $"op-{@ref}",
            Type = WorkflowType.Generic,
            Steps = [new StepRequest { Command = new Command.Debug.Noop() }],
            DependsOn = dependsOn.Length > 0 ? dependsOn.Select(d => (WorkflowRef)d).ToList() : null,
        };

    [Fact]
    public void ValidateAndSort_SingleWorkflow_NoError()
    {
        // Arrange
        var requests = new List<WorkflowRequest> { MakeRequest("a") };

        // Act
        var result = WorkflowGraphUtils.ValidateAndSortGraph(requests);

        // Assert
        Assert.Single(result);
        Assert.Equal("a", result[0].Ref);
    }

    [Fact]
    public void ValidateAndSort_DiamondDag_ReturnsSortedOrder()
    {
        // Arrange
        // Diamond: a → b, a → c, b → d, c → d
        var requests = new List<WorkflowRequest>
        {
            MakeRequest("b", "a"),
            MakeRequest("d", "b", "c"),
            MakeRequest("a"),
            MakeRequest("c", "a"),
        };

        // Act
        var result = WorkflowGraphUtils.ValidateAndSortGraph(requests);

        // Assert
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
    public void ValidateAndSort_DuplicateRef_Throws()
    {
        // Arrange
        var requests = new List<WorkflowRequest> { MakeRequest("a"), MakeRequest("a") };

        // Act & Assert
        var ex = Assert.Throws<ArgumentException>(() => WorkflowGraphUtils.ValidateAndSortGraph(requests));
        Assert.Contains("Duplicate ref 'a'", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateAndSort_UnknownDependsOnRef_Throws()
    {
        // Arrange
        var requests = new List<WorkflowRequest> { MakeRequest("a", "nonexistent") };

        // Act & Assert
        var ex = Assert.Throws<ArgumentException>(() => WorkflowGraphUtils.ValidateAndSortGraph(requests));
        Assert.Contains("'nonexistent'", ex.Message, StringComparison.Ordinal);
        Assert.Contains("not present in the batch", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateAndSort_Cycle_Throws()
    {
        // Arrange: a → b → c → a
        var requests = new List<WorkflowRequest>
        {
            MakeRequest("a", "c"),
            MakeRequest("b", "a"),
            MakeRequest("c", "b"),
        };

        // Act & Assert
        var ex = Assert.Throws<ArgumentException>(() => WorkflowGraphUtils.ValidateAndSortGraph(requests));
        Assert.Contains("cycle", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateAndSort_SelfReference_Throws()
    {
        // Arrange
        var requests = new List<WorkflowRequest> { MakeRequest("a", "a") };

        // Act & Assert
        var ex = Assert.Throws<ArgumentException>(() => WorkflowGraphUtils.ValidateAndSortGraph(requests));
        Assert.Contains("self-reference", ex.Message, StringComparison.OrdinalIgnoreCase);
    }
}
