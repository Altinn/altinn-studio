using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;

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
    /// <param name="party">Whom the user in preview acts for.</param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    /// <returns>The URL that opens the app in preview, or <c>null</c> when the developer has no working copy of it.</returns>
    Task<Uri?> StartSession(
        string developer,
        string org,
        string app,
        PreviewParty party,
        CancellationToken cancellationToken
    );

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

    /// <summary>
    /// The form data of an instance in one of the developer's sessions, by data element.
    /// </summary>
    /// <param name="developer">The developer, as Designer authenticated them.</param>
    /// <param name="org">The app's service owner.</param>
    /// <param name="app">The app.</param>
    /// <param name="sessionUrl">The session's URL, as <see cref="StartSession"/> returned it.</param>
    /// <param name="instanceId">The instance's ID, <c>{partyId}/{instanceGuid}</c>.</param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    /// <returns>The form data elements, or <c>null</c> when the developer has no such session or instance.</returns>
    Task<IReadOnlyList<PreviewFormDataElement>?> ReadFormData(
        string developer,
        string org,
        string app,
        Uri sessionUrl,
        string instanceId,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Replaces the data of a form data element of an instance in one of the developer's sessions.
    /// </summary>
    /// <param name="developer">The developer, as Designer authenticated them.</param>
    /// <param name="org">The app's service owner.</param>
    /// <param name="app">The app.</param>
    /// <param name="sessionUrl">The session's URL, as <see cref="StartSession"/> returned it.</param>
    /// <param name="instanceId">The instance's ID, <c>{partyId}/{instanceGuid}</c>.</param>
    /// <param name="dataElementId">The form data element.</param>
    /// <param name="data">The element's new data.</param>
    /// <param name="cancellationToken">A token to cancel the request.</param>
    /// <returns><c>false</c> when the developer has no such session, instance or data element.</returns>
    Task<bool> WriteFormData(
        string developer,
        string org,
        string app,
        Uri sessionUrl,
        string instanceId,
        Guid dataElementId,
        JsonObject data,
        CancellationToken cancellationToken
    );
}
