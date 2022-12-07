using Designer.Tests.Factories.ModelFactory.BaseClasses;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.Factories.ModelFactory;

public class JsonSchemaConversionTests : CsharpModelConversionTestsBase<JsonSchemaConversionTests>
{
    [Theory]
    [InlineData("Model/JsonSchema/NonXsdContextSchema.json")]
    public void JsonSchemaShouldConvertToXsdAndCSharp(string jsonSchemaPath)
    {
        Given.That.JsonSchemaLoaded(jsonSchemaPath)
            .When.JsonSchemaConverted2Metamodel()
            .And.CSharpClassesCreatedFromMetamodel()
            .And.CSharpClassesCompiledToAssembly()
            .Then.CompiledAssembly.Should().NotBeNull();

        And.When.JsonSchemaConvertedToXsdSchema()
            .Then.XsdSchema.Should().NotBeNull();
    }
}
