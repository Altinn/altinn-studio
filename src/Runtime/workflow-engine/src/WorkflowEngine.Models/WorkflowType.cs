namespace WorkflowEngine.Models;

public enum WorkflowType
{
    [ConcurrencyPolicy(ConcurrencyPolicy.Unrestricted)]
    Generic = 0,

    [ConcurrencyPolicy(ConcurrencyPolicy.SingleActive)]
    AppProcessChange = 1,
}
