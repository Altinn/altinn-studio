#nullable disable
using System.Collections.Generic;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using JetBrains.Annotations;

namespace Altinn.Studio.Designer.Models;
public class FooterFile
{
    [JsonPropertyName("$schema")]
    public string Schema { get; set; }

    [JsonPropertyName("footer")]
    public List<FooterLayout> Footer { get; set; }
}

public class FooterLayout
{
    [JsonPropertyName("type")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ComponentType Type { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; }

    [JsonPropertyName("target")]
    [CanBeNull]
    public string Target { get; set; }

    [JsonPropertyName("icon")]
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public IconType? Icon { get; set; }
}

public enum ComponentType
{
    Email,
    Link,
    Phone,
    Text
}

public enum IconType
{
    [EnumMember(Value = "information")]
    Information,
    [EnumMember(Value = "email")]
    Email,
    [EnumMember(Value = "phone")]
    Phone
}
