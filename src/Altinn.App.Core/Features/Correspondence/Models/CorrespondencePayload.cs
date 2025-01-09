using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Authorisation properties which are common for all correspondence interaction.
/// </summary>
public abstract record CorrespondencePayloadBase
{
    internal Func<Task<JwtToken>>? AccessTokenFactory { get; init; }

    internal CorrespondenceAuthorisation? AuthorisationMethod { get; init; }

    internal abstract string RequiredScope { get; }
}

/// <summary>
/// Represents the payload for sending a correspondence.
/// </summary>
public sealed record SendCorrespondencePayload : CorrespondencePayloadBase
{
    internal CorrespondenceRequest CorrespondenceRequest { get; init; }
    internal override string RequiredScope => CorrespondenceApiScopes.Write;

    /// <summary>
    /// Instantiates a new payload for <see cref="SendCorrespondencePayload"/>.
    /// </summary>
    /// <param name="request">The correspondence request to send</param>
    /// <param name="accessTokenFactory">Access token factory delegate (e.g. <see cref="MaskinportenClient.GetAltinnExchangedToken"/>) to use for authorisation</param>
    public SendCorrespondencePayload(CorrespondenceRequest request, Func<Task<JwtToken>> accessTokenFactory)
    {
        CorrespondenceRequest = request;
        AccessTokenFactory = accessTokenFactory;
    }

    /// <summary>
    /// Instantiates a new payload for <see cref="SendCorrespondencePayload"/>.
    /// </summary>
    /// <param name="request">The correspondence request to send</param>
    /// <param name="authorisation">The built-in authorisation method to use</param>
    public SendCorrespondencePayload(CorrespondenceRequest request, CorrespondenceAuthorisation authorisation)
    {
        CorrespondenceRequest = request;
        AuthorisationMethod = authorisation;
    }
}

/// <summary>
/// Represents a payload for querying the status of a correspondence.
/// </summary>
public sealed record GetCorrespondenceStatusPayload : CorrespondencePayloadBase
{
    internal Guid CorrespondenceId { get; init; }
    internal override string RequiredScope => CorrespondenceApiScopes.Write;

    /// <summary>
    /// Instantiates a new payload for <see cref="CorrespondenceClient.GetStatus"/>.
    /// </summary>
    /// <param name="correspondenceId">The correspondence identifier to retrieve information about</param>
    /// <param name="accessTokenFactory">Access token factory delegate (e.g. <see cref="MaskinportenClient.GetAltinnExchangedToken"/>) to use for authorisation</param>
    public GetCorrespondenceStatusPayload(Guid correspondenceId, Func<Task<JwtToken>> accessTokenFactory)
    {
        CorrespondenceId = correspondenceId;
        AccessTokenFactory = accessTokenFactory;
    }

    /// <summary>
    /// Instantiates a new payload for <see cref="CorrespondenceClient.GetStatus"/>.
    /// </summary>
    /// <param name="correspondenceId">The correspondence identifier to retrieve information about</param>
    /// <param name="authorisation">The built-in authorisation method to use</param>
    public GetCorrespondenceStatusPayload(Guid correspondenceId, CorrespondenceAuthorisation authorisation)
    {
        CorrespondenceId = correspondenceId;
        AuthorisationMethod = authorisation;
    }
}
