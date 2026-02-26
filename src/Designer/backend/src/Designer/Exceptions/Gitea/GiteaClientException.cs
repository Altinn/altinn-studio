using System;

namespace Altinn.Studio.Designer.Exceptions.Gitea;

/// <summary>
/// Used for exceptions occurring in the gitea client
/// </summary>
public class GiteaClientException(string message) : Exception(message);
