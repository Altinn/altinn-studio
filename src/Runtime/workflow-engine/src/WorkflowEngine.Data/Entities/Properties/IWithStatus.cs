using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Entities;

internal interface IWithStatus
{
    ProcessEngineItemStatus Status { get; set; }
}
