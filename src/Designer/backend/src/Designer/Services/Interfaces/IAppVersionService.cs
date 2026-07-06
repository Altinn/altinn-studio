using Altinn.Studio.Designer.Models;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Interfaces;

public interface IAppVersionService
{
    /// <summary>
    /// Returns the app-lib version of the given app, or <c>null</c> if no version is found
    /// (e.g. when the app uses a project reference instead of a package reference).
    /// Callers must guard against a null return value.
    /// </summary>
    SemanticVersion GetAppLibVersion(AltinnRepoEditingContext altinnRepoEditingContext);

    /// <summary>
    /// Returns whether the given app targets app-lib v9 or newer. An app whose version cannot be
    /// resolved (e.g. no matching package reference) is treated as not being v9.
    /// </summary>
    bool IsV9App(AltinnRepoEditingContext altinnRepoEditingContext);
}
