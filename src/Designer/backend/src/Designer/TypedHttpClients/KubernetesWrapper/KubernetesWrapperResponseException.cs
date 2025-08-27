using System;

namespace Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

public class KubernetesWrapperResponseException : Exception
{
    public KubernetesWrapperResponseException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
