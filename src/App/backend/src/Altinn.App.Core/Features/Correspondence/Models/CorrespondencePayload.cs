namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Authorization properties which are common for all correspondence interaction.
/// </summary>
public abstract record CorrespondencePayloadBase
{
    internal CorrespondenceAuthenticationMethod AuthenticationMethod { get; }

    internal CorrespondencePayloadBase(CorrespondenceAuthenticationMethod authenticationMethod)
    {
        // Guarded rather than left to the nullable annotation: the legacy authorization path used to
        // reject a missing authentication method with a CorrespondenceArgumentException, and a
        // nullable-oblivious caller passing null would otherwise only fail deep inside Send/GetStatus.
        ArgumentNullException.ThrowIfNull(authenticationMethod);
        AuthenticationMethod = authenticationMethod;
    }
}

/// <summary>
/// Represents the payload for sending a correspondence.
/// </summary>
public sealed record SendCorrespondencePayload : CorrespondencePayloadBase
{
    internal CorrespondenceRequest CorrespondenceRequest { get; }

    /// <summary>
    /// Instantiates a new payload for <see cref="CorrespondenceClient.Send"/>.
    /// </summary>
    /// <param name="request">The correspondence request to send</param>
    /// <param name="authenticationMethod">The authentication method to use</param>
    public SendCorrespondencePayload(
        CorrespondenceRequest request,
        CorrespondenceAuthenticationMethod authenticationMethod
    )
        : base(authenticationMethod)
    {
        ArgumentNullException.ThrowIfNull(request);
        CorrespondenceRequest = request;
    }
}

/// <summary>
/// Represents a payload for querying the status of a correspondence.
/// </summary>
public sealed record GetCorrespondenceStatusPayload : CorrespondencePayloadBase
{
    internal Guid CorrespondenceId { get; }

    /// <summary>
    /// Instantiates a new payload for <see cref="CorrespondenceClient.GetStatus"/>.
    /// </summary>
    /// <param name="correspondenceId">The correspondence identifier to retrieve information about</param>
    /// <param name="authenticationMethod">The authentication method to use</param>
    public GetCorrespondenceStatusPayload(
        Guid correspondenceId,
        CorrespondenceAuthenticationMethod authenticationMethod
    )
        : base(authenticationMethod)
    {
        CorrespondenceId = correspondenceId;
    }
}
