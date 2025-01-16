using System;

namespace Altinn.Studio.Designer.Repository.ORMImplementation.Models;

public class AppScopesDbModel
{
    /// <summary>
    /// The unique identifier for the object
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// The app name
    /// </summary>
    public string App { get; set; }

    /// <summary>
    /// The organization name
    /// </summary>
    public string Org { get; set; }

    /// <summary>
    /// The time the object was created
    /// </summary>
    public DateTimeOffset Created { get; set; }

    /// <summary>
    /// Maskinporten scopes saved as JSON array
    /// </summary>
    public string Scopes { get; set; }

    /// <summary>
    /// Identifies the user who created the object
    /// </summary>
    public string CreatedBy { get; set; }

    /// <summary>
    /// Identifies the user who last modified the object
    /// </summary>
    public string LastModifiedBy { get; set; }

    /// <summary>
    /// This will be used as concurrency token to handle optimistic concurrency
    /// </summary>
    public uint Version { get; set; }
}
