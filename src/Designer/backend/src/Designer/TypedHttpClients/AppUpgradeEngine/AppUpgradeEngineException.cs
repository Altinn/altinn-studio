using System;

namespace Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine;

public class AppUpgradeEngineException : Exception
{
    public AppUpgradeEngineException(string message)
        : base(message) { }

    public AppUpgradeEngineException(string message, Exception innerException)
        : base(message, innerException) { }
}
