using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Models.sharedperson;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.logic;

public class PrefillSharedPerson(IDataClient dataClient) : IProcessTaskEnd
{
    public async Task End(string taskId, Instance instance)
    {
        if (taskId != "Task_1")
            return;

        FormDataHelper formDataHelper = new FormDataHelper(instance, dataClient);
        sharedperson person = await formDataHelper.GetFormData<sharedperson>();

        person.name = "Ola Nordmann";
        person.address = new address
        {
            streetAddress = "Testveien 123",
            zipCode = "4609",
            city = "Kardemomme By",
        };

        await formDataHelper.UpdateFormData(person);
    }
}
