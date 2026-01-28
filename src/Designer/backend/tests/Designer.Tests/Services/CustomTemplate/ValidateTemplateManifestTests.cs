using System;
using System.Linq;
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
        ""name"": { ""nb"": ""Test Template"" },
        ""description"": { ""nb"": ""Dette er en norsk beskrivelse."", ""en"":""This is an English description""},
        ""remove"": [""src/oldfile.txt""],
        ""packageReferences"": [{""project"":""App/*.csproj"", ""include"":""MyPackage"", ""version"":""1.0.0""}]
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
        ""name"": {{ ""nb"": ""Test Template"" }},
        ""description"": {{ ""nb"": ""This is a valid description for the template."" }},
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
        ""name"": { ""nb"": ""Test Template"" },
        ""description"": { ""nb"": ""This is a valid description for the template."" },
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
    public async Task ValidateManifestJsonAsync_MissingNbInName_ReturnsError()
    {
        var missingNbName = @"{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": { ""en"": ""Test Template"" },
        ""description"": { ""nb"": ""This is a valid description for the template."" },
        ""contentPath"": ""templates/test"",
        ""remove"": [""src/oldfile.txt""]
        }";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(missingNbName);
        Assert.Contains(errors, e => e.Path.Contains("name") && e.Kind == ValidationErrorKind.PropertyRequired);
    }

    [Fact]
    public async Task ValidateManifestJsonAsync_MissingNbDescription_ReturnsError()
    {
        var missingNbDescription = @"{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": { ""nb"": ""Test Template"" },
        ""description"": { ""en"": ""This is a valid description for the template."" },
        ""contentPath"": ""templates/test"",
        ""remove"": [""src/oldfile.txt""]
        }";
        var errors = await CustomTemplateService.ValidateManifestJsonAsync(missingNbDescription);
        Assert.Contains(errors, e => e.Path.Contains("description") && e.Kind == ValidationErrorKind.PropertyRequired);
    }

    [Theory]
    [InlineData("/absolute/App.csproj")]
    [InlineData("../../other/App.csproj")]
    [InlineData("C:/Users/App.csproj")]
    [InlineData("\\\\server\\\\share")]
    [InlineData("App/project.txt")]  // Not a .csproj file
    [InlineData("App\\\\App.csproj")]  // Backslashes not allowed
    public async Task ValidateManifestJsonAsync_InvalidPackageReferenceProject_ReturnsError(string project)
    {
        var invalidProjectManifest = $@"{{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": {{ ""nb"": ""Test Template"" }},
        ""description"": {{ ""nb"": ""Dette er en norsk beskrivelse.""}},      
        ""packageReferences"": [{{
            ""project"": ""{project}"",
            ""include"": ""MyPackage"",
            ""version"": ""1.0.0""
        }}]
        }}";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(invalidProjectManifest);
        Assert.Contains(errors, e => e.Path.Contains("packageReferences[0]") && e.Kind == ValidationErrorKind.ArrayItemNotValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("-InvalidStart")]
    [InlineData(".InvalidStart")]
    [InlineData("Invalid Package")]  // Space not allowed
    [InlineData("Invalid/Package")]  // Slash not allowed
    public async Task ValidateManifestJsonAsync_InvalidPackageReferenceInclude_ReturnsError(string include)
    {
        var invalidIncludeManifest = $@"{{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": {{ ""nb"": ""Test Template"" }},
        ""description"": {{ ""nb"": ""This is a valid description for the template."" }},
        ""packageReferences"": [{{
            ""project"": ""App/*.csproj"",
            ""include"": ""{include}"",
            ""version"": ""1.0.0""
        }}]
        }}";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(invalidIncludeManifest);
        Assert.NotEmpty(errors);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-version")]
    [InlineData("1.2.3.4.5")]
    [InlineData("v1.2.3")]  // 'v' prefix not allowed
    public async Task ValidateManifestJsonAsync_InvalidPackageReferenceVersion_ReturnsError(string version)
    {
        var invalidVersionManifest = $@"{{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": {{ ""nb"": ""Test Template"" }},
        ""description"": {{ ""nb"": ""This is a valid description for the template."" }},
        ""packageReferences"": [{{
            ""project"": ""App/*.csproj"",
            ""include"": ""MyPackage"",
            ""version"": ""{version}""
        }}]
        }}";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(invalidVersionManifest);
        Assert.NotEmpty(errors);
    }

    [Theory]
    [InlineData("project")]
    [InlineData("include")]
    [InlineData("version")]
    public async Task ValidateManifestJsonAsync_MissingRequiredPackageReferenceProperty_ReturnsError(string missingProperty)
    {
        var properties = new System.Collections.Generic.Dictionary<string, string>
        {
            { "project", "App/*.csproj" },
            { "include", "MyPackage" },
            { "version", "1.0.0" }
        };
        properties.Remove(missingProperty);

        var manifest = $@"{{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": {{ ""nb"": ""Test Template"" }},
        ""description"": {{ ""nb"": ""This is a valid description for the template."" }},
        ""packageReferences"": [{{
            {string.Join(",\n            ", properties.Select(p => $@"""{p.Key}"": ""{p.Value}"""))}
        }}]
        }}";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(manifest);
        Assert.Contains(errors, e => e.Path.Contains("packageReferences[0]") && e.Kind == ValidationErrorKind.ArrayItemNotValid);
    }

    [Fact]
    public async Task ValidateManifestJsonAsync_PackageReferenceWithUnknownProperty_ReturnsError()
    {
        var unknownPropertyManifest = @"{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": { ""nb"": ""Test Template"" },
        ""description"": { ""nb"": ""This is a valid description for the template."" },
        ""packageReferences"": [{
            ""project"": ""App/*.csproj"",
            ""include"": ""MyPackage"",
            ""version"": ""1.0.0"",
            ""unknownProperty"": ""shouldBeRejected""
        }]
        }";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(unknownPropertyManifest);
        Assert.Contains(errors, e => e.Path.Contains("packageReferences[0]") && e.Kind == ValidationErrorKind.ArrayItemNotValid);
    }

    [Theory]
    [InlineData("1.2.3")]
    [InlineData("1.2.3-preview")]
    [InlineData("1.2.3-beta.1")]
    [InlineData("[1.2.3]")]
    [InlineData("1.2.*")]
    [InlineData("1.*")]
    public async Task ValidateManifestJsonAsync_ValidPackageReferenceVersions_ReturnsNoErrors(string version)
    {
        var validVersionManifest = $@"{{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": {{ ""nb"": ""Test Template"" }},
        ""description"": {{ ""nb"": ""This is a valid description for the template."" }},
        ""packageReferences"": [{{
            ""project"": ""App/*.csproj"",
            ""include"": ""MyPackage"",
            ""version"": ""{version}""
        }}]
        }}";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(validVersionManifest);
        Assert.Empty(errors);
    }    
}
