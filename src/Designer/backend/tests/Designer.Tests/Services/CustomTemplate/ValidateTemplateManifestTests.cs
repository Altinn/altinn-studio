using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Implementation;
using NJsonSchema.Validation;
using Xunit;

namespace Designer.Tests.Services.CustomTemplate;

public class ValidateCustomTemplateTest
{
    [Fact]
    public async Task ValidateManifestJsonAsync_ValidManifest_ReturnsNoErrors()
    {
        var validManifest = @"{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
        ""remove"": [""src/oldfile.txt""]
        }";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(validManifest);
        Assert.Empty(errors);
    }
    [Theory]
    [InlineData("/absolute/path")]
    [InlineData("../../other/app/templates")]
    [InlineData("C:/Users/user/file.txt")]
    [InlineData("/tmp/file.txt")]
    public async Task ValidateManifestJsonAsync_InvalidRemoveEntries_ReturnsError(string remove)
    {
        var invalidRemoveManifest = $@"{{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""This is a valid description for the template."",
        ""contentPath"": ""templates/test"",
        ""remove"": [""{remove}""]
        }}";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(invalidRemoveManifest);
        Assert.Contains(errors, e => e.Path.Contains("remove[0]") && e.Kind == ValidationErrorKind.ArrayItemNotValid);
    }

    [Fact]
    public async Task ValidateManifestJsonAsync_UnknownProperty_ReturnsError()
    {
        var unknownPropertyManifest = @"{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""This is a valid description for the template."",
        ""contentPath"": ""templates/test"",
        ""remove"": [""src/oldfile.txt""],
        ""unknownProperty"": ""shouldBeRejected""
        }";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(unknownPropertyManifest);
        Assert.Contains(errors, e => e.Kind == ValidationErrorKind.NoAdditionalPropertiesAllowed);
    }

    [Fact]
    public async Task ValidateManifestJsonAsync_NullOrEmpty_ThrowsArgumentException()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => CustomTemplateService.ValidateManifestJsonAsync(null));
        await Assert.ThrowsAsync<ArgumentException>(() => CustomTemplateService.ValidateManifestJsonAsync(""));
    }

    [Fact]
    public async Task ValidateManifestJsonAsync_MissingName_ReturnsError()
    {
        var missingNbName = @"{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""description"": ""This is a valid description for the template."",
        ""contentPath"": ""templates/test"",
        ""remove"": [""src/oldfile.txt""]
        }";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(missingNbName);
        Assert.Contains(errors, e => e.Path.Contains("name") && e.Kind == ValidationErrorKind.PropertyRequired);
    }

    [Fact]
    public async Task ValidateManifestJsonAsync_MissingDescription_ReturnsError()
    {
        var missingNbDescription = @"{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""contentPath"": ""templates/test"",
        ""remove"": [""src/oldfile.txt""]
        }";
        var errors = await CustomTemplateService.ValidateManifestJsonAsync(missingNbDescription);
        Assert.Contains(errors, e => e.Path.Contains("description") && e.Kind == ValidationErrorKind.PropertyRequired);
    }
}
