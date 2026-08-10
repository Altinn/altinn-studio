using System;
using System.Collections.Generic;
using System.IO;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using NuGet.Versioning;
using Xunit;

namespace Designer.Tests.Services;

public class AppTemplateCatalogTests : IDisposable
{
    private readonly string _templateRoot;

    public AppTemplateCatalogTests()
    {
        _templateRoot = Path.Combine(Path.GetTempPath(), "AltinnStudioTests", Guid.NewGuid().ToString(), "Templates");
        Directory.CreateDirectory(_templateRoot);
    }

    [Fact]
    public void GetAppTemplates_TwoTemplatesOnDisk_ReturnsBothWithVersions()
    {
        // Arrange
        WriteTemplate("v8", displayName: "Altinn App v8", appLibVersion: "8.12.7");
        WriteTemplate("v9", displayName: "Altinn App v9 (preview)", appLibVersion: "9.0.0-preview.3");
        var sut = CreateCatalog();

        // Act
        IReadOnlyList<AppTemplate> result = sut.GetAppTemplates();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("v8", result[0].Id);
        Assert.Equal("Altinn App v8", result[0].DisplayName);
        Assert.Equal("8.12.7", result[0].AppLibVersion);
        Assert.Equal(SemanticVersion.Parse("9.0.0-preview.3"), result[1].AppLibSemanticVersion);
    }

    [Fact]
    public void GetAppTemplates_DeprecatedTemplate_IsOrderedLast()
    {
        // Arrange
        WriteTemplate("v8", displayName: "Altinn App v8", appLibVersion: "8.12.7", deprecated: true);
        WriteTemplate("v9", displayName: "Altinn App v9", appLibVersion: "9.0.0");
        var sut = CreateCatalog();

        // Act
        IReadOnlyList<AppTemplate> result = sut.GetAppTemplates();

        // Assert
        Assert.Equal("v9", result[0].Id);
        Assert.Equal("v8", result[1].Id);
    }

    [Fact]
    public void GetAppTemplates_FolderWithoutManifest_IsIgnored()
    {
        // Arrange
        WriteTemplate("v9", displayName: "Altinn App v9", appLibVersion: "9.0.0");
        Directory.CreateDirectory(Path.Combine(_templateRoot, "not-a-template", "src"));
        var sut = CreateCatalog();

        // Act & Assert
        Assert.Equal("v9", Assert.Single(sut.GetAppTemplates()).Id);
    }

    [Fact]
    public void GetAppTemplates_PathsPointIntoTheTemplateContent()
    {
        // Arrange
        WriteTemplate("v8", displayName: "Altinn App v8", appLibVersion: "8.12.7");
        var sut = CreateCatalog();

        // Act
        AppTemplate result = Assert.Single(sut.GetAppTemplates());

        // Assert
        Assert.Equal(Path.Combine(_templateRoot, "v8", "src"), result.RootPath);
        Assert.Equal(Path.Combine(_templateRoot, "v8", "src", "App"), result.AppPath);
        Assert.Equal(Path.Combine(_templateRoot, "v8", "src", "deployment"), result.DeploymentPath);
    }

    [Fact]
    public void GetAppTemplates_ManifestIdDiffersFromFolder_FolderNameWins()
    {
        // The paths are built from the folder name, so it has to be authoritative.
        // Arrange
        WriteTemplate("v9", displayName: "Altinn App v9", appLibVersion: "9.0.0", manifestId: "something-else");
        var sut = CreateCatalog();

        // Act & Assert
        Assert.Equal("v9", Assert.Single(sut.GetAppTemplates()).Id);
    }

    [Fact]
    public void GetDefaultAppTemplate_ConfiguredDefaultExists_ReturnsIt()
    {
        // Arrange
        WriteTemplate("v8", displayName: "Altinn App v8", appLibVersion: "8.12.7");
        WriteTemplate("v9", displayName: "Altinn App v9", appLibVersion: "9.0.0");
        var sut = CreateCatalog(defaultAppTemplate: "v9");

        // Act & Assert
        Assert.Equal("v9", sut.GetDefaultAppTemplate().Id);
    }

    [Fact]
    public void GetDefaultAppTemplate_ConfiguredDefaultMissing_Throws()
    {
        // Creating applications from the wrong scaffold is worse than refusing to create them.
        // Arrange
        WriteTemplate("v9", displayName: "Altinn App v9", appLibVersion: "9.0.0");
        var sut = CreateCatalog(defaultAppTemplate: "v8");

        // Act & Assert
        var exception = Assert.Throws<InvalidOperationException>(() => sut.GetDefaultAppTemplate());
        Assert.Contains("v8", exception.Message);
    }

    [Fact]
    public void TryGetAppTemplate_UnknownId_ReturnsFalse()
    {
        // Arrange
        WriteTemplate("v8", displayName: "Altinn App v8", appLibVersion: "8.12.7");
        var sut = CreateCatalog();

        // Act & Assert
        Assert.False(sut.TryGetAppTemplate("v42", out _));
        Assert.True(sut.TryGetAppTemplate("v8", out _));
    }

    [Fact]
    public void GetAppTemplates_TemplateRootMissing_ReturnsEmpty()
    {
        // Arrange
        var sut = CreateCatalog(templateRoot: Path.Combine(_templateRoot, "does-not-exist"));

        // Act & Assert
        Assert.Empty(sut.GetAppTemplates());
    }

    private void WriteTemplate(
        string id,
        string displayName,
        string appLibVersion,
        bool deprecated = false,
        string manifestId = null
    )
    {
        string contentPath = Path.Combine(_templateRoot, id, "src");
        Directory.CreateDirectory(Path.Combine(contentPath, "App"));

        File.WriteAllText(
            Path.Combine(contentPath, "apptemplate.json"),
            $@"{{ ""id"": ""{manifestId ?? id}"", ""displayName"": ""{displayName}"", ""description"": ""Beskrivelse."", ""deprecated"": {deprecated.ToString().ToLowerInvariant()} }}"
        );

        File.WriteAllText(
            Path.Combine(contentPath, "App", "App.csproj"),
            $@"<Project Sdk=""Microsoft.NET.Sdk.Web""><ItemGroup><PackageReference Include=""Altinn.App.Api"" Version=""{appLibVersion}"" /></ItemGroup></Project>"
        );
    }

    private AppTemplateCatalog CreateCatalog(string defaultAppTemplate = "v8", string templateRoot = null) =>
        new(
            Options.Create(
                new GeneralSettings
                {
                    TemplateLocation = templateRoot ?? _templateRoot,
                    DefaultAppTemplate = defaultAppTemplate,
                }
            ),
            new Mock<ILogger<AppTemplateCatalog>>().Object
        );

    public void Dispose()
    {
        string testRoot = Path.GetDirectoryName(_templateRoot)!;
        if (Directory.Exists(testRoot))
        {
            Directory.Delete(testRoot, recursive: true);
        }

        GC.SuppressFinalize(this);
    }
}
