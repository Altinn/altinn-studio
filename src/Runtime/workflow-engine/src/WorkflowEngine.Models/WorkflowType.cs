using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.JsonConverters;

namespace WorkflowEngine.Models;

[JsonConverter(typeof(FlexibleEnumConverter<WorkflowType>))]
public enum WorkflowType
{
    [ConcurrencyPolicy(ConcurrencyPolicy.Unrestricted)]
    Generic = 0,

    [ConcurrencyPolicy(ConcurrencyPolicy.SingleActive)]
    AppProcessChange = 1,
}
