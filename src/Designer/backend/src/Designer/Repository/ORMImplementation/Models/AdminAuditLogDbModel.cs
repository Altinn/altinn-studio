#nullable disable
using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class AdminAuditLogDbModel
{
    public long Id { get; set; }

    public string Org { get; set; }

    public string App { get; set; }

    public string InstanceId { get; set; }

    public string Action { get; set; }

    public string UserName { get; set; }

    public string Env { get; set; }

    public DateTimeOffset Timestamp { get; set; }
}
