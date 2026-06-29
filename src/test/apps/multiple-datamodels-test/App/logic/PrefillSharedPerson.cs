using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Models;
using Altinn.App.Models.sharedperson;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic;

public class PrefillSharedPerson : IOnTaskEndingHandler
{
    public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

    public async Task<HookResult> Execute(OnTaskEndingContext context)
    {
        Instance instance = context.InstanceDataMutator.Instance;
        DataElement dataElement = instance.Data.Find(d => d.DataType == nameof(sharedperson));

        var person = (sharedperson)
            await context.InstanceDataMutator.GetFormData(new DataElementIdentifier(dataElement));

        person.name = "Ola Nordmann";
        person.address = new address
        {
            streetAddress = "Testveien 123",
            zipCode = "4609",
            city = "Kardemomme By",
        };

        return HookResult.Success();
    }
}
