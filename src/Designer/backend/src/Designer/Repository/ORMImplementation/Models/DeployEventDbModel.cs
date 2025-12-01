#nullable disable
using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class DeployEventDbModel
{
    public long Id { get; set; }

    public long DeploymentSequenceNo { get; set; }

    public string EventType { get; set; }

    public string Message { get; set; }

    public DateTimeOffset Timestamp { get; set; }

    public DeploymentDbModel Deployment { get; set; }
}