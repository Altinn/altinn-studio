using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models;

namespace Altinn.App.Actions;

public class ShiftingOptionsRemoveAll : IUserAction
{
    public string Id => "shiftingOptionsRemoveAll";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        var originalDataElements = context.DataMutator.GetDataElementsForType("ServiceModel-test");
        var originalData = await context.DataMutator.GetFormData(originalDataElements.First());
        var data = originalData as Skjema;

        RemoveAllRows(data);
        
        return UserActionResult.SuccessResult(new List<ClientAction>());
    }

    public static void RemoveAllRows(Skjema data)
    {
        data.ShiftingOptions ??= new ShiftingOptions();
        data.ShiftingOptions.Balloons ??= new List<Balloon>();
        data.ShiftingOptions.Balloons.Clear();
    }
}