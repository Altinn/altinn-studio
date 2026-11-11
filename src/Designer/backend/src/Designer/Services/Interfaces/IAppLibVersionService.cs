using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Reads which version of the app libraries published apps run.
/// </summary>
public interface IAppLibVersionService
{
    /// <summary>
    /// Gets the version of the app libraries, such as <c>8.7.2</c>, that each app runs in the environment, as the
    /// running app reports it, keyed by app. An app that cannot be asked, or that reports no version, has none.
    /// </summary>
    Task<IReadOnlyDictionary<string, string?>> GetAppLibVersions(
        string org,
        string environment,
        IEnumerable<AppImage> apps,
        CancellationToken cancellationToken
    );
}
