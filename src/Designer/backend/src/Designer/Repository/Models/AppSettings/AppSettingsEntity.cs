using System;

namespace Altinn.Studio.Designer.Repository.Models.AppSettings;

public class AppSettingsEntity
{
    public required string App { get; set; }
    public required string Org { get; set; }
    public string? Environment { get; set; }
    public bool UndeployOnInactivity { get; set; }
    public DateTimeOffset Created { get; set; }
    public string? CreatedBy { get; set; }
    public string? LastModifiedBy { get; set; }
    public uint Version { get; set; }
}
