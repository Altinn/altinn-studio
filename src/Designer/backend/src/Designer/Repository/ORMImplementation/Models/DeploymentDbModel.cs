#nullable disable
using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public partial class DeploymentDbModel
{
    public long Sequenceno { get; set; }

    public string Buildid { get; set; } = null!;

    public string Tagname { get; set; } = null!;

    public string Org { get; set; } = null!;

    public string App { get; set; } = null!;

    public string EnvName { get; set; } = null!;

    public string Buildresult { get; set; } = null!;

    public DateTime Created { get; set; }

    public string CreatedBy { get; set; } = null!;

    public string Entity { get; set; } = null!;

    public long? InternalBuildId { get; set; }

    public DeploymentType DeploymentType { get; set; } = DeploymentType.Deploy;

    public BuildDbModel Build { get; set; } = null!;
}

public enum DeploymentType
{
    Deploy = 0,
    Decommission = 1
}
