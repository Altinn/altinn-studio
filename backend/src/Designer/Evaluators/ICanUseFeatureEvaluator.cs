using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Evaluators;

public interface ICanUseFeatureEvaluator
{
    CanUseFeatureEnum Feature { get;  }
    Task<bool> CanUseFeatureAsync();
}
