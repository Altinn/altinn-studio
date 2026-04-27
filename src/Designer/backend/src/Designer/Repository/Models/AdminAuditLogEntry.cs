using System;

namespace Altinn.Studio.Designer.Repository.Models;

public record AdminAuditLogEntry
{
    public long Id { get; init; }
    public required string Org { get; init; }
    public required string App { get; init; }
    public required string InstanceId { get; init; }
    public required string Action { get; init; }
    public required long UserId { get; init; }
    public required string UserName { get; init; }
    public required string Env { get; init; }
    public required DateTimeOffset Timestamp { get; init; }
}
