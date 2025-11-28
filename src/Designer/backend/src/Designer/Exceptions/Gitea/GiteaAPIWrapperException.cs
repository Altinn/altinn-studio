using System;

namespace Altinn.Studio.Designer.Exceptions.Gitea;

/// <summary>
/// Used for exceptions occurring in the GiteaApi
/// </summary>
public class GiteaApiWrapperException(string message) : Exception(message);
