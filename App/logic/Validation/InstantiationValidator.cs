using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Logic.Validation;

public class InstantiationValidator : IInstantiationValidator
{
  public async Task<InstantiationValidationResult> Validate(Instance instance)
  {
    return await Task.FromResult((InstantiationValidationResult)null);
  }
}
