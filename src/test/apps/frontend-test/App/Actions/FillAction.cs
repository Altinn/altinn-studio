using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Actions;

public class FillAction : IUserAction
{
    private readonly ILogger<FillAction> _logger;

    public string Id => "fill";

    public FillAction(ILogger<FillAction> logger)
    {
        _logger = logger;
    }

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        _logger.LogInformation("FillAction triggered");

        var originalDataElements = context.DataMutator.GetDataElementsForType("ServiceModel-test");
        var originalData = await context.DataMutator.GetFormData(originalDataElements.First());
        var data = originalData as Skjema;

        if (data.TestCustomButtonInput == "Hello b")
        {
            return UserActionResult.FailureResult(new ActionError()
            {
                Code = "machine-readable-error-code",
                Message = "Her kommer det en feilmelding",
                Metadata = new Dictionary<string, string>()
                {
                    { "key1", "value1" },
                }
            });
        }

        if (data.TestCustomButtonInput == "Generate frontend actions")
        {
            return UserActionResult.SuccessResult(new List<ClientAction>()
                { ClientAction.NextPage(), ClientAction.PreviousPage(), ClientAction.NavigateToPage("grid") });
        }

        data.TestCustomButtonReadOnlyInput = "Her kommer det data fra backend";

        return UserActionResult.SuccessResult(new List<ClientAction>());
    }
}