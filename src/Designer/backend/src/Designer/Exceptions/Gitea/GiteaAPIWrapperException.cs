using System;

namespace Altinn.Studio.Designer.Exceptions.Gitea;

/// <summary>
/// Used for exceptions occurring in the GiteaApi
/// </summary>
public class GiteaApiWrapperException : Exception
{
    public GiteaApiWrapperException(string message) : base(message)
    {
    }
}
