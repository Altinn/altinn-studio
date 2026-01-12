namespace StudioGateway.Contracts.Alerts;

public class AlertPayload
{
    public string Status { get; set; }

    // public string Receiver { get; set; }
    public List<AlertPayloadInstance> Alerts { get; set; }
}

public class AlertPayloadInstance
{
    public string Status { get; set; }
    public Dictionary<string, string> Labels { get; set; }
    public Dictionary<string, string> Annotations { get; set; }

    // public DateTime StartsAt { get; set; }
    // public DateTime EndsAt { get; set; }
    public string GeneratorURL { get; set; }
}
