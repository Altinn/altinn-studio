using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Authorisation properties which are common for all correspondence interaction.
/// </summary>
public abstract record CorrespondencePayloadBase
{
    internal CorrespondenceAuthenticationMethod? AuthenticationMethod { get; init; }

    [Obsolete("Replaced by AuthenticationMethod")]
    internal Func<Task<JwtToken>>? AccessTokenFactory { get; init; }

    [Obsolete("Replaced by AuthenticationMethod")]
    internal CorrespondenceAuthorisation? AuthorisationMethod { get; init; }

    [Obsolete("Replaced by AuthenticationMethod")]
    internal string RequiredScope => CorrespondenceApiScopes.Write;
}

/// <summary>
/// Represents the payload for sending a correspondence.
/// </summary>
public sealed record SendCorrespondencePayload : CorrespondencePayloadBase
{
    internal CorrespondenceRequest CorrespondenceRequest { get; init; }

    /// <summary>
    /// Instantiates a new payload for <see cref="CorrespondenceClient.Send"/>.
    /// </summary>
    /// <param name="request">The correspondence request to send</param>
    /// <param name="authenticationMethod">The authentication method to use</param>
    public SendCorrespondencePayload(
        CorrespondenceRequest request,
        CorrespondenceAuthenticationMethod authenticationMethod
    )
    {
        CorrespondenceRequest = request;
        AuthenticationMethod = authenticationMethod;
    }

    /// <summary>
    /// Instantiates a new payload for <see cref="CorrespondenceClient.Send"/>.
    /// </summary>
    /// <param name="request">The correspondence request to send</param>
    /// <param name="accessTokenFactory">Access token factory delegate (e.g. <see cref="MaskinportenClient.GetAltinnExchangedToken"/>) to use for authorisation</param>
    [Obsolete("Use SendCorrespondencePayload(CorrespondenceRequest, CorrespondenceAuthenticationMethod) instead")]
    public SendCorrespondencePayload(CorrespondenceRequest request, Func<Task<JwtToken>> accessTokenFactory)
    {
        CorrespondenceRequest = request;
        AccessTokenFactory = accessTokenFactory;
    }

    /// <summary>
    /// Instantiates a new payload for <see cref="CorrespondenceClient.Send"/>.
    /// </summary>
    /// <param name="request">The correspondence request to send</param>
    /// <param name="authorisation">The built-in authorisation method to use</param>
    [Obsolete("Use SendCorrespondencePayload(CorrespondenceRequest, CorrespondenceAuthenticationMethod) instead")]
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

    /// <summary>
    /// Instantiates a new payload for <see cref="CorrespondenceClient.Send"/>.
    /// </summary>
    /// <param name="correspondenceId">The correspondence identifier to retrieve information about</param>
    /// <param name="authenticationMethod">The authentication method to use</param>
    public GetCorrespondenceStatusPayload(
        Guid correspondenceId,
        CorrespondenceAuthenticationMethod authenticationMethod
    )
    {
        CorrespondenceId = correspondenceId;
        AuthenticationMethod = authenticationMethod;
    }

    /// <summary>
    /// Instantiates a new payload for <see cref="CorrespondenceClient.GetStatus"/>.
    /// </summary>
    /// <param name="correspondenceId">The correspondence identifier to retrieve information about</param>
    /// <param name="accessTokenFactory">Access token factory delegate (e.g. <see cref="MaskinportenClient.GetAltinnExchangedToken"/>) to use for authorisation</param>
    [Obsolete("Use GetCorrespondenceStatusPayload(Guid, CorrespondenceAuthenticationMethod) instead")]
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
    [Obsolete("Use GetCorrespondenceStatusPayload(Guid, CorrespondenceAuthenticationMethod) instead")]
    public GetCorrespondenceStatusPayload(Guid correspondenceId, CorrespondenceAuthorisation authorisation)
    {
        CorrespondenceId = correspondenceId;
        AuthorisationMethod = authorisation;
    }
}
