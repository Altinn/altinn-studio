using System.Text.Json;
using Altinn.App.Api.Models;
using FluentAssertions;

namespace Altinn.App.Api.Tests.Models;

public class JsonPatchOperationTests
{
    private const string AllOperations = """
        [
            {"op":"add","path":"/a","value":{"b":1}},
            {"op":"remove","path":"/b"},
            {"op":"replace","path":"/c/0","value":null},
            {"op":"test","path":"/f~1g/h~0i","value":[1,2]},
            {"op":"test","path":"","value":{}}
        ]
        """;

    [Fact]
    public void ParseList_ReadsEveryOperationType()
    {
        var operations = JsonPatchOperation.ParseList(AllOperations);

        operations
            .Select(o => o.Op)
            .Should()
            .Equal(
                JsonPatchOperationType.Add,
                JsonPatchOperationType.Remove,
                JsonPatchOperationType.Replace,
                JsonPatchOperationType.Test,
                JsonPatchOperationType.Test
            );
        operations[0].Value!.ToJsonString().Should().Be("""{"b":1}""");
        operations[1].Value.Should().BeNull();
        operations[2].Value.Should().BeNull();
        operations[3].Path.Should().Be("/f~1g/h~0i");
        operations[4].Path.Should().BeEmpty();
    }

    [Fact]
    public void Serialize_WritesOnlyTheMembersOfEachOperation()
    {
        var operations = JsonPatchOperation.ParseList(AllOperations);

        var json = JsonSerializer.Serialize(operations);

        json.Should()
            .Be(
                """[{"op":"add","path":"/a","value":{"b":1}},{"op":"remove","path":"/b"},{"op":"replace","path":"/c/0","value":null},{"op":"test","path":"/f~1g/h~0i","value":[1,2]},{"op":"test","path":"","value":{}}]"""
            );
    }

    [Fact]
    public void ParseList_IgnoresMembersThatDoNotBelongToTheOperation()
    {
        var operations = JsonPatchOperation.ParseList(
            """[{"op":"remove","path":"/a","value":1,"from":"/b","extra":{"x":1}}]"""
        );

        operations.Single().Value.Should().BeNull();
    }

    [Theory]
    [InlineData("""[{"op":"add","path":"/a"}]""", "`add` operation requires `value`")]
    [InlineData("""[{"op":"replace","path":"/a"}]""", "`replace` operation requires `value`")]
    [InlineData("""[{"op":"test","path":"/a"}]""", "`test` operation requires `value`")]
    [InlineData("""[{"op":"remove"}]""", "`remove` operation requires `path`")]
    [InlineData("""[{"path":"/a","value":1}]""", "A JSON Patch operation requires `op`")]
    [InlineData("""[{"op":"bogus","path":"/a","value":1}]""", "`bogus` is not a JSON Patch operation")]
    [InlineData(
        """[{"op":"move","from":"/b","path":"/a"}]""",
        "`move` operations are not supported; use `add` and `remove` instead"
    )]
    [InlineData(
        """[{"op":"copy","from":"/b","path":"/a"}]""",
        "`copy` operations are not supported; use `add` and `remove` instead"
    )]
    [InlineData(
        """[{"op":"add","path":"a","value":1}]""",
        "`path` of `add` operation is not a valid JSON Pointer: `a`"
    )]
    [InlineData(
        """[{"op":"add","path":"/a~2","value":1}]""",
        "`path` of `add` operation is not a valid JSON Pointer: `/a~2`"
    )]
    [InlineData("""[{"op":1,"path":"/a"}]""", "`op` of a JSON Patch operation must be a string")]
    [InlineData("""["add"]""", "A JSON Patch operation must be an object")]
    [InlineData("""[null]""", "A JSON Patch operation must be an object")]
    [InlineData(
        """[{"op":"test","path":"/o","value":{"x":null,"x":1}}]""",
        "`value` of a JSON Patch operation has duplicate member names*"
    )]
    [InlineData(
        """[{"op":"add","path":"/o","value":[{"a":{"b":1,"b":2}}]}]""",
        "`value` of a JSON Patch operation has duplicate member names*"
    )]
    public void ParseList_RejectsOperationsThatBreakRfc6902(string json, string expectedMessage)
    {
        var act = () => JsonPatchOperation.ParseList(json);

        act.Should().Throw<JsonException>().WithMessage($"{expectedMessage}*");
    }

    [Fact]
    public void ParseList_RejectsNull()
    {
        var act = () => JsonPatchOperation.ParseList("null");

        act.Should().Throw<JsonException>().WithMessage("A JSON Patch document must be an array of operations*");
    }
}
