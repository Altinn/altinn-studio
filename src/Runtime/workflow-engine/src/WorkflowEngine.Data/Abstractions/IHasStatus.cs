using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Abstractions;

internal interface IHasStatus
{
    PersistentItemStatus Status { get; set; }
}
