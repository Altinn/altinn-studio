using System;
using System.Threading;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.TypedHttpClients.PreviewService;

/// <summary>
/// The preview service's internal API.
/// </summary>
public interface IPreviewServiceClient
{
    /// <summary>
    /// Starts a session that previews the developer's working copy of the app.
    /// </summary>
    /// <param name="developer">The developer, as Designer authenticated them.</param>
    /// <param name="org">The app's service owner.</param>
    /// <param name="app">The app.</param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    /// <returns>The URL that opens the app in preview, or <c>null</c> when the developer has no working copy of it.</returns>
    Task<Uri?> StartSession(string developer, string org, string app, CancellationToken cancellationToken);
}
