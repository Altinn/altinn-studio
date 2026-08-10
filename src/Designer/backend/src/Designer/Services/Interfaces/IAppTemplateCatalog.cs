using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// The app scaffolds new applications can be created from, discovered from the template root the Designer
/// image ships.
/// </summary>
public interface IAppTemplateCatalog
{
    /// <summary>
    /// All available templates, ordered by id.
    /// </summary>
    IReadOnlyList<AppTemplate> GetAppTemplates();

    /// <summary>
    /// Looks up a template by id. Returns false for an unknown id.
    /// </summary>
    bool TryGetAppTemplate(string id, [NotNullWhen(true)] out AppTemplate? appTemplate);

    /// <summary>
    /// The template used when the caller does not ask for a specific one.
    /// </summary>
    /// <exception cref="System.InvalidOperationException">
    /// Thrown when the configured default does not exist. Creating applications from the wrong scaffold is
    /// worse than refusing to create them, so this is never silently substituted.
    /// </exception>
    AppTemplate GetDefaultAppTemplate();
}
