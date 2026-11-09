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

    /// <summary>
    /// Creates an instance at a task in one of the developer's sessions, so the editors can show the task.
    /// </summary>
    /// <param name="developer">The developer, as Designer authenticated them.</param>
    /// <param name="org">The app's service owner.</param>
    /// <param name="app">The app.</param>
    /// <param name="sessionUrl">The session's URL, as <see cref="StartSession"/> returned it.</param>
    /// <param name="taskId">The task the instance starts at.</param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    /// <returns>
    /// The instance's ID, <c>{partyId}/{instanceGuid}</c>, or <c>null</c> when the developer has no such session of
    /// the app.
    /// </returns>
    Task<string?> CreateInstance(
        string developer,
        string org,
        string app,
        Uri sessionUrl,
        string taskId,
        CancellationToken cancellationToken
    );
}
