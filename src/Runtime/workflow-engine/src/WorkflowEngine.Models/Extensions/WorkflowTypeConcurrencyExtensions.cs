using System.Collections.Frozen;
using System.Reflection;

namespace WorkflowEngine.Models.Extensions;

public static class WorkflowTypeConcurrencyExtensions
{
    private static readonly FrozenDictionary<WorkflowType, ConcurrencyPolicy> _policyMap = BuildPolicyMap();

    public static ConcurrencyPolicy GetConcurrencyPolicy(this WorkflowType type) =>
        _policyMap.GetValueOrDefault(type, ConcurrencyPolicy.Unrestricted);

    private static FrozenDictionary<WorkflowType, ConcurrencyPolicy> BuildPolicyMap()
    {
        var map = new Dictionary<WorkflowType, ConcurrencyPolicy>();
        var enumFields = typeof(WorkflowType).GetFields(BindingFlags.Public | BindingFlags.Static);

        foreach (var field in enumFields)
        {
            var attr = field.GetCustomAttribute<ConcurrencyPolicyAttribute>();
            var value = field.GetValue(null) as WorkflowType?;

            if (attr is null || value is null)
                continue;

            map[value.Value] = attr.Policy;
        }

        return map.ToFrozenDictionary();
    }
}
