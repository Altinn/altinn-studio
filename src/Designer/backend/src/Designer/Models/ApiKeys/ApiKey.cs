using System;

namespace Altinn.Studio.Designer.Models.ApiKey;

public class ApiKey
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public ApiKeyType TokenType { get; init; }
    public DateTimeOffset ExpiresAt { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public string Username { get; init; } = string.Empty;
}
