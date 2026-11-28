using Altinn.Studio.Preview.Files;

namespace Altinn.Studio.Preview.Sessions;

/// <summary>
/// A session that lets the browser holding its ID preview one working copy.
/// </summary>
/// <param name="WorkingCopy">The working copy the session reads.</param>
/// <param name="StartedAt">When Designer started the session.</param>
/// <param name="PartyId">The party the user acts for, of those <see cref="AppApi.MockUser"/> can act for.</param>
internal sealed record PreviewSession(WorkingCopy WorkingCopy, DateTimeOffset StartedAt, int PartyId);
