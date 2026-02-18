namespace WorkflowEngine.Models;

public enum WorkflowType
{
    Generic = 0,

    [ConcurrencyPolicy(ConcurrencyPolicy.SingleActive)]
    AppProcessChange = 1,
}
