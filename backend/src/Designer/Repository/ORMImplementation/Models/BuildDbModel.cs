using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class BuildDbModel
{
    public long Id { get; set; }

    public string ExternalId { get; set; }

    public string Status { get; set; }

    public string Result { get; set; }

    public BuildType BuildType { get; set; }

    public DateTimeOffset? Started { get; set; }

    public DateTimeOffset? Finished { get; set; }
}

public enum BuildType
{
    Deployment = 0,
    Decommission = 1,
    Release = 2
}
