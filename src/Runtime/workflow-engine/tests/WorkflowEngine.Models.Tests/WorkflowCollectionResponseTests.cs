using System.Text.Json;

namespace WorkflowEngine.Models.Tests;

public class WorkflowCollectionResponseTests
{
    private static readonly JsonSerializerOptions _options = new();

    private static WorkflowCollectionResponse CreateResponse(CollectionWorkflowCounts? counts) =>
        new()
        {
            Key = "col-1",
            Namespace = "ttd:app",
            Heads = [Guid.NewGuid()],
            CreatedAt = DateTimeOffset.UtcNow,
            WorkflowCounts = counts,
        };

    [Fact]
    public void WorkflowCounts_WhenNull_IsOmittedFromWire()
    {
        // The rollup is nullable-optional for wire additivity: an older engine simply omits it,
        // and consumers must tolerate absence.
        var json = JsonSerializer.Serialize(CreateResponse(counts: null), _options);

        Assert.DoesNotContain("workflowCounts", json, StringComparison.Ordinal);
    }

    [Fact]
    public void WorkflowCounts_WhenPopulated_CarriesAllFourBuckets()
    {
        var counts = new CollectionWorkflowCounts
        {
            Active = 3,
            FailedVisible = 0,
            FailedInvisible = 1,
            Total = 12,
        };

        var json = JsonSerializer.Serialize(CreateResponse(counts), _options);

        using var doc = JsonDocument.Parse(json);
        var element = doc.RootElement.GetProperty("workflowCounts");
        Assert.Equal(3, element.GetProperty("active").GetInt32());
        Assert.Equal(0, element.GetProperty("failedVisible").GetInt32());
        Assert.Equal(1, element.GetProperty("failedInvisible").GetInt32());
        Assert.Equal(12, element.GetProperty("total").GetInt32());
    }

    [Fact]
    public void ListResponse_UnmatchedKeys_IsOmittedWhenNullAndExplicitWhenEmpty()
    {
        // unmatchedKeys is an annotate-mode concept: absent (null) outside annotate mode, but an
        // explicit empty array when every requested key matched.
        var baseResponse = new WorkflowCollectionListResponse
        {
            Data = [],
            PageSize = 25,
            TotalCount = 0,
        };

        var listModeJson = JsonSerializer.Serialize(baseResponse, _options);
        Assert.DoesNotContain("unmatchedKeys", listModeJson, StringComparison.Ordinal);

        var annotateJson = JsonSerializer.Serialize(baseResponse with { UnmatchedKeys = [] }, _options);
        using var doc = JsonDocument.Parse(annotateJson);
        Assert.Equal(0, doc.RootElement.GetProperty("unmatchedKeys").GetArrayLength());
    }
}
