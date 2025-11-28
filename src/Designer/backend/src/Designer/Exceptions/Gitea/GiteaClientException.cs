using System;

namespace Altinn.Studio.Designer.Exceptions.Gitea;

/// <summary>
/// Used for exceptions occurring in the GiteaClient
/// </summary>
public class GiteaClientException(string message) : Exception(message);
