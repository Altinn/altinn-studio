using System;
using Altinn.Studio.Designer.Models.UserAccount;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class UserAccountDbModel
{
    public Guid Id { get; set; }
    public string? PidHash { get; set; }
    public string Username { get; set; } = string.Empty;
    public AccountType AccountType { get; set; }
    public string? OrganizationName { get; set; }
    public bool Deactivated { get; set; }
    public DateTimeOffset? DeactivatedAt { get; set; }
    public Guid? CreatedByUserAccountId { get; set; }
    public DateTimeOffset Created { get; set; }

    public UserAccountDbModel? CreatedByUserAccount { get; set; }
}
