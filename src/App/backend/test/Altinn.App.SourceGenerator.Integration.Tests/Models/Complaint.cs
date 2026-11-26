using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.App.SourceGenerator.Integration.Tests.Models;

public abstract class Submission
{
    [JsonPropertyName("reference")]
    public string? Reference { get; set; }
}

public class Complaint : Submission
{
    [JsonPropertyName("claimants")]
    public List<Claimant>? Claimants { get; set; }

    [JsonPropertyName("agent")]
    public Agent? Agent { get; set; }
}

public class Participant
{
    [JsonPropertyName("altinnRowId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("contact")]
    public Contact? Contact { get; set; }
}

public class Claimant : Participant
{
    [JsonPropertyName("role")]
    public string? Role { get; set; }
}

public class Agent : Participant { }

public class Contact
{
    [JsonPropertyName("email")]
    public string? Email { get; set; }
}
