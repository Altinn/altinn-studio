using System.Text.Json.Nodes;
using Altinn.App.Api.Helpers.Patch;
using Altinn.App.Api.Models;
using FluentAssertions;

namespace Altinn.App.Api.Tests.Helpers.Patch;

public class JsonPatchApplierTests
{
    private static JsonNode Document() => JsonNode.Parse("""{"name":null,"tags":["a"],"nested":{"n":1}}""")!;

    [Fact]
    public void Apply_AppliesOperationsInOrderToACopy()
    {
        var document = Document();
        var operations = JsonPatchOperation.ParseList(
            """
            [
                { "op": "test", "path": "/name", "value": null },
                { "op": "replace", "path": "/name", "value": "Ola" },
                { "op": "add", "path": "/tags/-", "value": "b" },
                { "op": "remove", "path": "/tags/0" }
            ]
            """
        );

        var result = JsonPatchApplier.Apply(operations, document);

        var applied = result.Value.Should().BeOfType<JsonPatchApplied>().Which;
        applied.Document!.ToJsonString().Should().Be("""{"name":"Ola","tags":["b"],"nested":{"n":1}}""");
        document.ToJsonString().Should().Be(Document().ToJsonString(), "the input document is not changed");
    }

    [Fact]
    public void Apply_ReportsAFailedTestAsATestFailure()
    {
        var operations = JsonPatchOperation.ParseList(
            """
            [
                { "op": "replace", "path": "/name", "value": "Ola" },
                { "op": "test", "path": "/name", "value": "Kari" },
                { "op": "remove", "path": "/tags" }
            ]
            """
        );

        var result = JsonPatchApplier.Apply(operations, Document());

        var failed = result.Value.Should().BeOfType<JsonPatchFailed>().Which;
        failed.IsTestFailure.Should().BeTrue();
        failed.OperationIndex.Should().Be(1);
        failed.Operation.Should().BeSameAs(operations[1]);
        failed.Message.Should().Be("Test operation 1 failed: the value at `/name` is not equal to the expected value.");
    }

    [Fact]
    public void Apply_ReportsATestOfAMissingLocationAsAnError()
    {
        var operations = JsonPatchOperation.ParseList(
            """
            [
                { "op": "remove", "path": "/nested" },
                { "op": "test", "path": "/nested/n", "value": 1 }
            ]
            """
        );

        var result = JsonPatchApplier.Apply(operations, Document());

        var failed = result.Value.Should().BeOfType<JsonPatchFailed>().Which;
        failed.IsTestFailure.Should().BeFalse();
        failed.OperationIndex.Should().Be(1);
        failed.Message.Should().StartWith("Operation 1 (test `/nested/n`) failed: ");
    }

    [Fact]
    public void Apply_ReportsOtherFailuresWithTheOperationAndPath()
    {
        var operations = JsonPatchOperation.ParseList(
            """
            [
                { "op": "test", "path": "/name", "value": null },
                { "op": "replace", "path": "/missing", "value": 1 }
            ]
            """
        );

        var result = JsonPatchApplier.Apply(operations, Document());

        var failed = result.Value.Should().BeOfType<JsonPatchFailed>().Which;
        failed.IsTestFailure.Should().BeFalse();
        failed.OperationIndex.Should().Be(1);
        failed.Message.Should().StartWith("Operation 1 (replace `/missing`) failed: ");
    }
}
