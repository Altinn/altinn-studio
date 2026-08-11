using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class RepositoryActivityDbModel
{
    public required string Developer { get; set; }
    public required string Org { get; set; }
    public required string Repository { get; set; }
    public DateTimeOffset LastAccessedAt { get; set; }
    public bool CleanupPending { get; set; }
}
