using Altinn.App.Models;

namespace Altinn.App.logic.DataProcessing
{
    public class InstantiationProcessor : IInstantiationProcessor
    {
        public async Task DataCreation(IInstanceDataMutator instanceDataMutator, object datamodel, Dictionary<string, string>? prefill)
        {
            if (datamodel is data model)
            {
                form formData = model.form ??= new form();
                formData.year = DateTime.Now.Year - 1;
            }

            await Task.CompletedTask;
        }
    }
}
