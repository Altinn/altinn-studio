using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Logic.DataProcessing;

public class InstantiationProcessor : IInstantiationProcessor
{
  public async Task DataCreation(Instance instance, object data, Dictionary<string, string> prefill)
  {
    await Task.CompletedTask;
  }
}
