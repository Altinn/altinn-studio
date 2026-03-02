using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class ApiKeyDbModel
{
    public long Id { get; set; }
    public string KeyHash { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public bool Revoked { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
