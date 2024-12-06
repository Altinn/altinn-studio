using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.TypedHttpClients.EidLogger;

public class EidLogRequest
{
    public string EventName { get; set; }
    public DateTime EventCreated { get; set; }
    public string EventDescription { get; set; }
    public Dictionary<string, string> StudioData { get; set; }
}
