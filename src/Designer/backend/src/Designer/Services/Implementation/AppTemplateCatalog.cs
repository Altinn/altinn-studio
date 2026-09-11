using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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

        AppTemplate[] appTemplates =
        [
            .. Directory
                .EnumerateDirectories(templateRoot)
                .Select(ReadAppTemplate)
                .OfType<AppTemplate>()
                .OrderBy(template => template.Id, StringComparer.Ordinal),
        ];

        _logger.LogInformation(
            "Discovered {AppTemplateCount} app templates: {AppTemplateIds}",
            appTemplates.Length,
            string.Join(", ", appTemplates.Select(template => template.Id))
        );

        return appTemplates;
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

            return new AppTemplate
            {
                Id = folderName,
                DisplayName = string.IsNullOrWhiteSpace(manifest.DisplayName) ? folderName : manifest.DisplayName,
                Description = manifest.Description ?? string.Empty,
                RootPath = contentPath,
            };
        }
        catch (Exception e) when (e is JsonException or IOException or UnauthorizedAccessException)
        {
            _logger.LogError(e, "Failed to read app template manifest {ManifestPath}. Skipping.", manifestPath);
            return null;
        }
    }

    /// <summary>
    /// Presentation only. The id comes from the folder name, which is what the paths are built from.
    /// </summary>
    private sealed class AppTemplateManifest
    {
        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }
}
