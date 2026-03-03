using System.Text.Json.Serialization;
using WorkflowEngine.Resilience.JsonConverters;

namespace WorkflowEngine.Models;

[JsonConverter(typeof(FlexibleEnumConverter<WorkflowType>))]
public enum WorkflowType
{
    Generic = 0,

    AppProcessChange = 1,
}
