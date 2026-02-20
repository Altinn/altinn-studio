using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class DeveloperIdentityMappingDbModel
{
    public string PidHash { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public DateTimeOffset Created { get; set; }
}
