namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Known scopes for the correspondence API.
/// </summary>
[Obsolete("Replaced by CorrespondenceAuthenticationMethod")]
internal static class CorrespondenceApiScopes
{
    public const string ServiceOwner = "altinn:serviceowner";
    public const string Read = "altinn:correspondence.read";
    public const string Write = "altinn:correspondence.write";
}
