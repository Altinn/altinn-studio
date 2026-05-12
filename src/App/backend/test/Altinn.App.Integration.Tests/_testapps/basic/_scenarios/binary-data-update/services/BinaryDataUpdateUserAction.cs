using System.Text;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Integration.Tests.Scenarios.BinaryDataUpdate;

internal sealed class BinaryDataUpdateUserAction : IUserAction
{
    public string Id => "update-binary-data";

    public Task<UserActionResult> HandleAction(UserActionContext context)
    {
        if (
            !context.ActionMetadata.TryGetValue("dataElementId", out string? dataElementId)
            || string.IsNullOrWhiteSpace(dataElementId)
        )
        {
            return Task.FromResult(
                UserActionResult.FailureResult(
                    new ActionError { Code = "MissingDataElementId", Message = "dataElementId metadata is required." },
                    errorType: ProcessErrorType.BadRequest
                )
            );
        }

        if (!context.ActionMetadata.TryGetValue("newContent", out string? newContent))
        {
            return Task.FromResult(
                UserActionResult.FailureResult(
                    new ActionError { Code = "MissingNewContent", Message = "newContent metadata is required." },
                    errorType: ProcessErrorType.BadRequest
                )
            );
        }

        context.DataMutator.UpdateBinaryDataElement(
            new DataElementIdentifier(dataElementId),
            Encoding.UTF8.GetBytes(newContent)
        );

        return Task.FromResult(UserActionResult.SuccessResult());
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IUserAction, BinaryDataUpdateUserAction>();
    }
}
