using System;

namespace Altinn.Studio.Designer.Exceptions.AppDevelopment;

[Serializable]
public class ResourceRegistryPublishingException : Exception
{
    public ResourceRegistryPublishingException() : base()
    {
    }

    public ResourceRegistryPublishingException(string message) : base(message)
    {
    }
}

