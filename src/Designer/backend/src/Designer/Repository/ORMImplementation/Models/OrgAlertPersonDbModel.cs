using System;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class OrgAlertPersonDbModel
{
    public Guid Id { get; set; }
    public string Org { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public AlertSeverity EmailSeverity { get; set; }
    public string? Phone { get; set; }
    public AlertSeverity SmsSeverity { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public string? Services { get; set; }
}
