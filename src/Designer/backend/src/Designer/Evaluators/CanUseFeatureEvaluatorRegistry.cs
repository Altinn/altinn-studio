#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Evaluators;

public class CanUseFeatureEvaluatorRegistry
{
    private readonly Dictionary<CanUseFeatureEnum, ICanUseFeatureEvaluator> _evaluators;

    public CanUseFeatureEvaluatorRegistry(IEnumerable<ICanUseFeatureEvaluator> evaluators)
    {
        _evaluators = evaluators.ToDictionary(e => e.Feature, e => e);
    }

    public ICanUseFeatureEvaluator GetEvaluator(CanUseFeatureEnum feature)
    {
        if (_evaluators.TryGetValue(feature, out var evaluator))
        {
            return evaluator;
        }

        throw new ArgumentException($"No evaluator registered for feature: {feature}");
    }
}
