#nullable disable
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Evaluators;

public interface ICanUseFeatureEvaluator
{
    CanUseFeatureEnum Feature { get; }

    /// <param name="org">Owner of the repository being edited.</param>
    /// <param name="app">The repository being edited.</param>
    Task<bool> CanUseFeatureAsync(string org, string app);
}
