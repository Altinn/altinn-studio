using System.Collections.Generic;

namespace Altinn.App.Services.Configuration
{
    /// <summary>
    /// Represents settings used by the front end react application. These settings are separate because they are
    /// exposed to the end user. They should never contain secrets.
    /// </summary>
    public class FrontEndSettings : Dictionary<string, string>
    {
    }
}
