using System;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class PersonalAccessTokenDbModel
{
    public long Id { get; set; }
    public string KeyHash { get; set; } = string.Empty;
    public Guid UserAccountId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public PersonalAccessTokenType TokenType { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public bool Revoked { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public UserAccountDbModel UserAccount { get; set; } = null!;
}
