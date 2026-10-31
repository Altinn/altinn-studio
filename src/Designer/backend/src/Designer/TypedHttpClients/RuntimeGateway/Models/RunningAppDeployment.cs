using System;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;

/// <summary>
/// What the runtime gateway reports runs of an app, with only the fields Designer reads.
/// </summary>
/// <param name="ImageTag">The tag of the app's image.</param>
/// <param name="BuildId">The build of the deploy that runs.</param>
/// <param name="SourceEnvironment">The Studio environment that deployed the app, such as <c>prod</c>.</param>
/// <param name="Status">
/// <c>ready</c>, <c>updating</c>, <c>unavailable</c> or <c>failed</c>. A string, so that a status a newer gateway adds
/// does not make the environment unreadable.
/// </param>
/// <param name="RestartedAt">When the app was last restarted without a deploy.</param>
public sealed record RunningAppDeployment(
    string? ImageTag,
    string? BuildId,
    string? SourceEnvironment,
    string? Status,
    DateTimeOffset? RestartedAt
);
