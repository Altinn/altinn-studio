using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Enums;

/// <summary>
/// The author role of a chat message.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Role
{
    User = 0,
    Assistant = 1,
}
