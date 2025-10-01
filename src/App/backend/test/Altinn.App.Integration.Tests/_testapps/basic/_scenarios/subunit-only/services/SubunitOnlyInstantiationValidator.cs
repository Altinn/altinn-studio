using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using TestApp.Shared;

#nullable enable

namespace Altinn.App.Integration.Tests.Scenarios.SubunitOnly;

public class SubunitOnlyInstantiationValidator : IInstantiationValidator
{
    public Task<InstantiationValidationResult?> Validate(Instance instance)
    {
        // This is just here to verify that scenario based codegen works
        SnapshotLogger.LogInfo($"IInstantiationValidator.Validate ({nameof(SubunitOnlyInstantiationValidator)})");

        return Task.FromResult<InstantiationValidationResult?>(null);
    }
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddScoped<IInstantiationValidator, SubunitOnlyInstantiationValidator>();
    }
}
