using System;
using Altinn.Studio.Designer.Models.UserAccount;

namespace Altinn.Studio.Designer.Models.BotAccount;

public class BotAccount
{
    public Guid Id { get; init; }
    public string Username { get; init; } = string.Empty;
    public string OrganizationName { get; init; } = string.Empty;
    public AccountType AccountType { get; init; }
    public bool Deactivated { get; init; }
    public DateTimeOffset Created { get; init; }
    public string? CreatedByUsername { get; init; }
}
