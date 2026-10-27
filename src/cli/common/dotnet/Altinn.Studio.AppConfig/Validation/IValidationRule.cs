using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation;

public interface IValidationRule
{
    RuleMetadata Metadata { get; }
    IEnumerable<Finding> Check(AppModel app);
}
