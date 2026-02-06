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
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
        ""remove"": [""src/oldfile.txt""],
        ""packageReferences"": [{""project"":""App/*.csproj"", ""include"":""MyPackage"", ""version"":""1.0.0""}],
        ""nextSteps"": [{""title"":""Get Started"", ""description"":""Follow these steps to get started."", ""type"":""documentation"", ""links"":[{ ""label"": ""Fiks integration guide"", ""ref"": ""https://fiks.ksdigi.no"" }]}]
        }";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(validManifest);
        Assert.Empty(errors);
    }

    [Fact]
    public async Task ValidateManifestJsonAsync_MissingSchemaVersion_ReturnsErrors()
    {
        var missingSchemaManifest = @"{
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."", }";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(missingSchemaManifest);
        Assert.Contains(errors, e => e.Kind == ValidationErrorKind.PropertyRequired && e.Property.Equals("schemaVersion"));
    }

    [Theory]
    [InlineData("/absolute/path")]
    [InlineData("../../other/app/templates")]
    [InlineData("C:/Users/user/file.txt")]
    [InlineData("/tmp/file.txt")]
    public async Task ValidateManifestJsonAsync_InvalidRemoveEntries_ReturnsError(string remove)
    {
        var invalidRemoveManifest = $@"{{
        ""schemaVersion"": ""0.1"",
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
        ""schemaVersion"": ""0.1"",
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
        ""schemaVersion"": ""0.1"",
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
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
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
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",  
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
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
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
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
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
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
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
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
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
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
        ""packageReferences"": [{{
            ""project"": ""App/*.csproj"",
            ""include"": ""MyPackage"",
            ""version"": ""{version}""
        }}]
        }}";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(validVersionManifest);
        Assert.Empty(errors);
    }

    [Fact]
    public async Task ValidateManifestJsonAsync_InvalidNextStep_MissingLinkRef_ReturnsErrors()
    {
        var invalidNextLinkManifest = @"{
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
         ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
        ""nextSteps"": [{""title"":""Get Started"", ""description"":""Follow these steps to get started."", ""type"":""documentation"", ""links"":[{ ""label"": ""Fiks integration guide"" }]}]
        }";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(invalidNextLinkManifest);
        Assert.Contains(errors, e => e.Path.Contains("nextSteps[0]") && e.Kind == ValidationErrorKind.ArrayItemNotValid);
    }

    [Fact]
    public async Task ValidateManifestJsonAsync_InvalidNextStep_MissingLinkLabel_ReturnsErrors()
    {
        var invalidNextLinkManifest = @"{
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
         ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
        ""nextSteps"": [{""title"":""Get Started"", ""description"":""Follow these steps to get started."", ""type"":""documentation"", ""links"":[{""ref"": ""https://fiks.ksdigi.no"" }]}]
        }";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(invalidNextLinkManifest);
        Assert.Contains(errors, e => e.Path.Contains("nextSteps[0]") && e.Kind == ValidationErrorKind.ArrayItemNotValid);
    }

    [Theory]
    [InlineData("configuration")]
    [InlineData("konfigurasjon")]
    [InlineData("code-change")]
    [InlineData("kodeendring")]
    [InlineData("documentation")]
    [InlineData("dokumentasjon")]
    public async Task ValidateManifestJsonAsync_ValidNextStepTypes_ReturnsNoErrors(string nextStepType)
    {
        var validManifest = $@"{{
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
        ""nextSteps"": [{{
            ""title"": ""Get Started"",
            ""description"": ""Follow these steps to get started."",
            ""type"": ""{nextStepType}"",
            ""links"": [{{
                ""label"": ""Integration guide"",
                ""ref"": ""https://example.com""
            }}]
        }}]
    }}";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(validManifest);
        Assert.Empty(errors);
    }

    [Theory]
    [InlineData("invalid-type")]
    [InlineData("Konfigurasjon")]
    [InlineData("config")]
    [InlineData("code")]
    [InlineData("docs")]
    [InlineData("")]
    [InlineData("unknown")]
    public async Task ValidateManifestJsonAsync_InvalidNextStepTypes_ReturnsErrors(string nextStepType)
    {
        var invalidManifest = $@"{{
        ""schemaVersion"": ""0.1"",
        ""id"": ""template-12345"",
        ""owner"": ""altinn"",
        ""name"": ""Test Template"",
        ""description"": ""Dette er en norsk beskrivelse."",
        ""nextSteps"": [{{
            ""title"": ""Get Started"",
            ""description"": ""Follow these steps to get started."",
            ""type"": ""{nextStepType}"",
            ""links"": [{{
                ""label"": ""Integration guide"",
                ""ref"": ""https://example.com""
            }}]
        }}]
    }}";

        var errors = await CustomTemplateService.ValidateManifestJsonAsync(invalidManifest);
        Assert.NotEmpty(errors);
    }
}
