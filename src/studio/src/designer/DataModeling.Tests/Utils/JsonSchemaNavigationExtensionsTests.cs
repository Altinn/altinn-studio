using Altinn.Studio.DataModeling.Utils;
using FluentAssertions;
using Json.Pointer;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Utils;

public class JsonSchemaNavigationExtensionsTests
{
    [Fact]
    public void Navigation_Should_Resolve_DeeplyNestedReferences()
    {
        JsonSchema schema = new JsonSchemaBuilder()
            .Schema(MetaSchemas.Draft201909Id)
            .Ref("#/$defs/test/items/properties/test")
            .Defs(
                ("test", new JsonSchemaBuilder()
                    .Items(new JsonSchemaBuilder()
                        .Properties(
                            ("test", new JsonSchemaBuilder().Type(SchemaValueType.String))))));

        var result = schema.FollowReference(JsonPointer.Parse(@"#/$defs/test/items/properties/test"));
        result.Should().NotBeNull();
    }
}
