namespace WorkflowEngine.Models;

public enum WorkflowStartMode
{
    Immediate = 0,
    Scheduled = 1,
    AfterParent = 2,
}
