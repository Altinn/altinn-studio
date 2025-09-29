using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Represents the method of authentication to be used for making requests to external services.
/// </summary>
/// <remarks>This record contains all possible authentication mechanisms, which are designed to
/// be exposed and consumed like illustrated in <see cref="StorageAuthenticationMethod"/>
/// </remarks>
internal abstract record AuthenticationMethod
{
    /// <inheritdoc cref="AuthenticationMethod.UserToken"/>
    internal static UserToken CurrentUser() => new();

    /// <summary>
    /// Indicates that an operation should be authenticated using service owner `read` and `write` scopes.
    /// </summary>
    internal static AltinnToken ServiceOwner() => new(_serviceOwnerScopes);

    /// <summary>
    /// Indicates that an operation should be authenticated using service owner `read` and `write` scopes, with additional scopes if provided.
    /// </summary>
    internal static AltinnToken ServiceOwner(params string[] additionalScopes) =>
        new([.. _serviceOwnerScopes, .. additionalScopes]);

    /// <inheritdoc cref="AuthenticationMethod.MaskinportenToken"/>
    internal static MaskinportenToken Maskinporten(string scope, params string[] additionalScopes) =>
        new([scope, .. additionalScopes]);

    /// <inheritdoc cref="AuthenticationMethod.MaskinportenToken"/>
    internal static MaskinportenToken Maskinporten(IEnumerable<string> scopes) => new([.. scopes]);

    /// <inheritdoc cref="AuthenticationMethod.CustomToken"/>
    internal static CustomToken Custom(Func<Task<JwtToken>> tokenProvider) => new(tokenProvider);

    private static readonly string[] _serviceOwnerScopes =
    [
        "altinn:serviceowner/instances.read",
        "altinn:serviceowner/instances.write",
    ];

    private AuthenticationMethod() { }

    /// <summary>
    /// Indicates that an operation should be authenticated using the current user's token
    /// </summary>
    internal sealed record UserToken : AuthenticationMethod;

    /// <summary>
    /// Indicates that an operation should be authenticated using a token with the specified scopes,
    /// provided by <see cref="MaskinportenClient.GetAltinnExchangedToken">MaskinportenClient.GetAltinnExchangedToken</see>.
    /// </summary>
    /// <param name="Scopes">The scopes associated with this request.</param>
    internal sealed record AltinnToken(string[] Scopes) : AuthenticationMethod;

    /// <summary>
    /// Indicates that an operation should be authenticated using a token with the specified scopes,
    /// provided by <see cref="MaskinportenClient.GetAccessToken">MaskinportenClient.GetAccessToken</see>.
    /// </summary>
    /// <param name="Scopes">The scopes associated with this request.</param>
    internal sealed record MaskinportenToken(string[] Scopes) : AuthenticationMethod;

    /// <summary>
    /// Indicates that an operation should be authenticated using a custom token provider.
    /// </summary>
    /// <param name="TokenProvider">The JWT token provider delegate for this request.</param>
    internal sealed record CustomToken(Func<Task<JwtToken>> TokenProvider) : AuthenticationMethod;

    public static implicit operator AuthenticationMethod(StorageAuthenticationMethod storageAuthenticationMethod) =>
        storageAuthenticationMethod.Request;

    public static implicit operator AuthenticationMethod(
        CorrespondenceAuthenticationMethod storageAuthenticationMethod
    ) => storageAuthenticationMethod.Request;
}

/// <summary>
/// Represents the method of authentication to be used for making requests to the Storage service.
/// </summary>
public sealed record StorageAuthenticationMethod
{
    /// <inheritdoc cref="AuthenticationMethod.CurrentUser"/>
    public static StorageAuthenticationMethod CurrentUser() => new(AuthenticationMethod.CurrentUser());

    /// <inheritdoc cref="AuthenticationMethod.ServiceOwner()"/>
    public static StorageAuthenticationMethod ServiceOwner() => new(AuthenticationMethod.ServiceOwner());

    /// <inheritdoc cref="AuthenticationMethod.ServiceOwner(string[])"/>
    public static StorageAuthenticationMethod ServiceOwner(params string[] additionalScopes) =>
        new(AuthenticationMethod.ServiceOwner(additionalScopes));

    /// <inheritdoc cref="AuthenticationMethod.Custom"/>
    public static StorageAuthenticationMethod Custom(Func<Task<JwtToken>> tokenProvider) =>
        new(AuthenticationMethod.Custom(tokenProvider));

    internal AuthenticationMethod Request { get; }

    private StorageAuthenticationMethod(AuthenticationMethod request)
    {
        Request = request;
    }
}

/// <summary>
/// Represents the method of authentication to be used for Correspondence requests.
/// </summary>
public sealed record CorrespondenceAuthenticationMethod
{
    private const string CorrespondenceWriteScope = "altinn:correspondence.write";

    /// <summary>
    /// Authenticates the request using a service owner token that includes the <c>altinn:correspondence.write</c> scope.
    /// </summary>
    public static CorrespondenceAuthenticationMethod Default() =>
        new(AuthenticationMethod.ServiceOwner(CorrespondenceWriteScope));

    /// <summary>
    /// Authenticates the request using a custom token delegate. The delegate must return an Altinn-exchanged service owner
    /// token that includes the <c>altinn:correspondence.write</c> scope.
    /// </summary>
    public static CorrespondenceAuthenticationMethod Custom(Func<Task<JwtToken>> tokenProvider) =>
        new(AuthenticationMethod.Custom(tokenProvider));

    internal AuthenticationMethod Request { get; }

    private CorrespondenceAuthenticationMethod(AuthenticationMethod request)
    {
        Request = request;
    }
}
