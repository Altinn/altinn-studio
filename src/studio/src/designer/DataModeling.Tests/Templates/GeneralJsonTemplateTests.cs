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

            var expectedId = "https://dev.altinn.studio/org/repository/app/model/model.schema.json";

            // Act
            var actualJsonTemplate = new GeneralJsonTemplate(new Uri(expectedId), "model");

            // Assert
            JsonSchema jsonSchema = JsonSchema.FromText(actualJsonTemplate.GetJsonString());
            var idKeyword = jsonSchema.GetKeyword<IdKeyword>();
            idKeyword.Id.Should().Be(expectedId);
            var messageType = jsonSchema.FollowReference(JsonPointer.Parse("#/$defs/model")).Should().NotBeNull();
        }
    }
}
