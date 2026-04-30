using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WorkflowEngine.Data.Entities;

[Table("WorkflowCollections", Schema = Constants.SchemaNames.Engine)]
internal sealed class WorkflowCollectionEntity
{
    [MaxLength(200)]
    public required string Key { get; set; }

    [MaxLength(200)]
    public required string Namespace { get; set; }

    [Column(TypeName = "uuid[]")]
    public required Guid[] Heads { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}
