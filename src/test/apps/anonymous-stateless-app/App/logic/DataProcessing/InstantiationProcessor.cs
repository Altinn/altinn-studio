namespace Altinn.App.Logic.DataProcessing;

public class InstantiationProcessor : IInstantiationProcessor
{
  public async Task DataCreation(IInstanceDataMutator instanceDataMutator, object data, Dictionary<string, string>? prefill)
  {
    await Task.CompletedTask;
  }
}
