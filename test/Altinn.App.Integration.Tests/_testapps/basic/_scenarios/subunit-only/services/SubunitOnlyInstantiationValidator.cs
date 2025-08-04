using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Integration.Tests.Scenarios.SubunitOnly;

public class SubunitOnlyInstantiationValidator : IInstantiationValidator
{
    public async Task<InstantiationValidationResult?> Validate(Instance instance)
    {
        // Custom validation logic for subunit-only scenario
        await Task.CompletedTask;

        // For this scenario, we're just validating that an instance owner exists
        // The actual party type validation is handled by the application metadata configuration
        if (instance.InstanceOwner?.PartyId == null)
        {
            return new InstantiationValidationResult
            {
                Valid = false,
                Message = "Instance must have a valid party owner",
            };
        }

        return null; // Valid - no errors
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddScoped<IInstantiationValidator, SubunitOnlyInstantiationValidator>();
    }
}
