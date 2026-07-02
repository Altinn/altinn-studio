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
}
