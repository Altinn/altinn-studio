#nullable enable
using System;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Identity for a person's identity like an author or committer
/// </summary>
public sealed class GiteaIdentity
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    public override bool Equals(object? obj)
    {
        GiteaIdentity? other = obj as GiteaIdentity;
        if (other is null)
        {
            return false;
        }
        if (Equals(other.Name, Name) is false)
        {
            return false;
        }
        if (Equals(other.Email, Email) is false)
        {
            return false;
        }
        return true;
    }
    public override int GetHashCode()
    {
        return HashCode.Combine(Name, Email);
    }
}
