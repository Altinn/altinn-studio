using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models;
using Altinn.App.services.options;

namespace Altinn.App.Actions;

public class ShiftingOptionsAdd : IUserAction
{
    public string Id => "shiftingOptionsAdd";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        var originalDataElements = context.DataMutator.GetDataElementsForType("ServiceModel-test");
        var originalData = await context.DataMutator.GetFormData(originalDataElements.First());
        var data = originalData as Skjema;

        AddRows(data, 10);

        return UserActionResult.SuccessResult(new List<ClientAction>());
    }

    public static void AddRows(Skjema data, decimal numRows)
    {
        data.ShiftingOptions ??= new ShiftingOptions();
        data.ShiftingOptions.Balloons ??= new List<Balloon>();

        for (int i = 0; i < numRows; i++)
        {
            var colorIndex = (int)(data.ShiftingOptions.GlobalCounter % BalloonColorsOptions.Colors.Count);

            data.ShiftingOptions.Balloons.Add(new Balloon
            {
                Num = data.ShiftingOptions.GlobalCounter,
                Color = $"{data.ShiftingOptions.GlobalCounter}-{colorIndex}",

            });
            data.ShiftingOptions.GlobalCounter++;
        }
    }
}