using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class OrgSettingsDbModel
{
    public long Id { get; set; }
    public required string Org { get; set; }
    public bool UndeployOnInactivity { get; set; }
    public int InactivityPeriodDays { get; set; }
    public DateTimeOffset Created { get; set; }
    public string? CreatedBy { get; set; }
    public string? LastModifiedBy { get; set; }
}
