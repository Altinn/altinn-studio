using System;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.DataModeling.Templates;
using Altinn.Studio.DataModeling.Utils;
using FluentAssertions;
using Json.Pointer;
using Json.Schema;
using Xunit;

namespace DataModeling.Tests.Templates
{
    public class GeneralJsonTemplateTests
    {
        [Fact]
        public void Constructor_TemplateExists_ShouldSetCorrectValues()
        {
            // Arrange
            JsonSchemaKeywords.RegisterXsdKeywords();

            string expectedId = "https://dev.altinn.studio/org/repository/app/model/model.schema.json";
            string expectedModelName = "model";

            // Act
            var actualJsonTemplate = new GeneralJsonTemplate(new Uri(expectedId), expectedModelName);

            // Assert
            JsonSchema jsonSchema = JsonSchema.FromText(actualJsonTemplate.GetJsonString());
            var idKeyword = jsonSchema.GetKeyword<IdKeyword>();
            idKeyword.Id.Should().Be(expectedId);
            jsonSchema.GetKeyword<XsdRootElementKeyword>().Value.Should().Be(expectedModelName);
            var properties = jsonSchema.GetKeyword<PropertiesKeyword>();
            properties.Properties.Should().NotBeEmpty();
            properties.Properties.Count.Should().Be(3);
        }
    }
}
