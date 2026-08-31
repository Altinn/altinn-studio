#nullable disable
using System;

namespace Altinn.Studio.Designer.TypedHttpClients.Exceptions;

/// <summary>
/// Altinn specific exception which can be caught specifically when Gitea returns Unauthorized (401)
/// </summary>
public class GiteaUnauthorizedException : Exception
{
    /// <summary>
    /// Constructor
    /// </summary>
    /// <param name="message">A custom message for this specific exception</param>
    public GiteaUnauthorizedException(string message)
        : base(message) { }
}
