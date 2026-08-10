using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Xml;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <inheritdoc />
public class AppTemplateCatalog : IAppTemplateCatalog
{
    private const string ManifestFileName = "apptemplate.json";

    /// <summary>
    /// Each template folder holds its scaffold under "src", both in the repository and in the Designer
    /// image, so the two layouts stay identical.
    /// </summary>
    private const string ContentFolderName = "src";

    private static readonly string[] s_appLibPackageNames = ["Altinn.App.Api", "Altinn.App.Api.Experimental"];

    private readonly GeneralSettings _generalSettings;
    private readonly ILogger<AppTemplateCatalog> _logger;
    private readonly Lazy<IReadOnlyList<AppTemplate>> _appTemplates;

    // GeneralSettings itself is registered scoped (it is resolved through IOptionsSnapshot), so this
    // singleton takes the singleton IOptions instead. The templates ship inside the image, so there is
    // nothing to reload.
    public AppTemplateCatalog(IOptions<GeneralSettings> generalSettings, ILogger<AppTemplateCatalog> logger)
    {
        _generalSettings = generalSettings.Value;
        _logger = logger;

        // The templates ship inside the Designer image, so they cannot change while the process runs.
        _appTemplates = new Lazy<IReadOnlyList<AppTemplate>>(DiscoverAppTemplates);
    }

    /// <inheritdoc />
    public IReadOnlyList<AppTemplate> GetAppTemplates() => _appTemplates.Value;

    /// <inheritdoc />
    public bool TryGetAppTemplate(string id, [NotNullWhen(true)] out AppTemplate? appTemplate)
    {
        appTemplate = string.IsNullOrWhiteSpace(id)
            ? null
            : _appTemplates.Value.FirstOrDefault(template =>
                string.Equals(template.Id, id, StringComparison.OrdinalIgnoreCase)
            );

        return appTemplate is not null;
    }

    /// <inheritdoc />
    public AppTemplate GetDefaultAppTemplate()
    {
        if (TryGetAppTemplate(_generalSettings.DefaultAppTemplate, out AppTemplate? appTemplate))
        {
            return appTemplate;
        }

        throw new InvalidOperationException(
            $"The configured default app template '{_generalSettings.DefaultAppTemplate}' was not found under "
                + $"'{_generalSettings.TemplateLocation}'. Found: "
                + $"[{string.Join(", ", _appTemplates.Value.Select(template => template.Id))}]."
        );
    }

    private IReadOnlyList<AppTemplate> DiscoverAppTemplates()
    {
        string templateRoot = _generalSettings.TemplateLocation;

        if (string.IsNullOrWhiteSpace(templateRoot) || !Directory.Exists(templateRoot))
        {
            _logger.LogError(
                "App template root {TemplateRoot} does not exist. No app templates available.",
                templateRoot
            );
            return [];
        }

        List<AppTemplate> appTemplates = [];

        foreach (string templateFolder in Directory.EnumerateDirectories(templateRoot))
        {
            AppTemplate? appTemplate = ReadAppTemplate(templateFolder);
            if (appTemplate is not null)
            {
                appTemplates.Add(appTemplate);
            }
        }

        AppTemplate[] ordered =
        [
            .. appTemplates
                .OrderBy(template => template.Deprecated)
                .ThenBy(template => template.Id, StringComparer.Ordinal),
        ];

        _logger.LogInformation(
            "Discovered {AppTemplateCount} app templates: {AppTemplateIds}",
            ordered.Length,
            string.Join(", ", ordered.Select(template => template.Id))
        );

        return ordered;
    }

    private AppTemplate? ReadAppTemplate(string templateFolder)
    {
        string contentPath = Path.Combine(templateFolder, ContentFolderName);
        string manifestPath = Path.Combine(contentPath, ManifestFileName);
        string folderName = new DirectoryInfo(templateFolder).Name;

        if (!File.Exists(manifestPath))
        {
            // Not every folder under the root has to be a template.
            return null;
        }

        try
        {
            AppTemplateManifest? manifest = JsonSerializer.Deserialize<AppTemplateManifest>(
                File.ReadAllText(manifestPath)
            );

            if (manifest is null)
            {
                _logger.LogError("App template manifest {ManifestPath} is empty. Skipping.", manifestPath);
                return null;
            }

            if (!string.IsNullOrWhiteSpace(manifest.Id) && manifest.Id != folderName)
            {
                // The folder name is what the paths are built from, so it wins.
                _logger.LogWarning(
                    "App template manifest {ManifestPath} declares id {ManifestId} but lives in folder "
                        + "{FolderName}. Using the folder name.",
                    manifestPath,
                    manifest.Id,
                    folderName
                );
            }

            return new AppTemplate
            {
                Id = folderName,
                DisplayName = string.IsNullOrWhiteSpace(manifest.DisplayName) ? folderName : manifest.DisplayName,
                Description = manifest.Description ?? string.Empty,
                Deprecated = manifest.Deprecated,
                RootPath = contentPath,
                AppLibSemanticVersion = ReadAppLibVersion(contentPath),
            };
        }
        catch (Exception e) when (e is JsonException or IOException or UnauthorizedAccessException)
        {
            _logger.LogError(e, "Failed to read app template manifest {ManifestPath}. Skipping.", manifestPath);
            return null;
        }
    }

    private SemanticVersion? ReadAppLibVersion(string contentPath)
    {
        string appProjectPath = Path.Combine(contentPath, "App", "App.csproj");

        try
        {
            if (
                PackageVersionHelper.TryGetPackageVersionFromCsprojFile(
                    appProjectPath,
                    s_appLibPackageNames,
                    out SemanticVersion version
                )
            )
            {
                return version;
            }

            _logger.LogWarning("No Altinn.App package reference found in {AppProjectPath}.", appProjectPath);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or XmlException)
        {
            _logger.LogWarning(e, "Failed to read {AppProjectPath}.", appProjectPath);
        }

        return null;
    }

    private sealed class AppTemplateManifest
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("deprecated")]
        public bool Deprecated { get; set; }
    }
}
