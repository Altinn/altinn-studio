using Altinn.App.Core.Features.Maskinporten;

namespace Altinn.App.Core.Features.Correspondence.Models;

/// <summary>
/// Defines an authorisation method to use with the correspondence server.
/// </summary>
public enum CorrespondenceAuthorisation
{
    /// <summary>
    /// Uses the built-in <see cref="MaskinportenClient"/> for authorization.
    /// </summary>
    Maskinporten,
}
