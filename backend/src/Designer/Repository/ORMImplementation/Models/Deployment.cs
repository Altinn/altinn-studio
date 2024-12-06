using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public partial class Deployment
{
    public long Sequenceno { get; set; }

    public string Buildid { get; set; } = null!;

    public string Tagname { get; set; } = null!;

    public string Org { get; set; } = null!;

    public string App { get; set; } = null!;

    public string Buildresult { get; set; } = null!;

    public DateTime Created { get; set; }

    public string Entity { get; set; } = null!;
}
