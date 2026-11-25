using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Integration.Tests.Scenarios.WorkflowEngineInstantiationDataCreationFailure;

public sealed class ThrowingInstantiationProcessor : IInstantiationProcessor
{
    public Task DataCreation(Instance instance, object data, Dictionary<string, string>? prefill) =>
        throw new InvalidOperationException("Scenario data creation threw.");
}

public static class ServiceRegistration
{
    public static void RegisterServices(IServiceCollection services)
    {
        services.AddTransient<IInstantiationProcessor, ThrowingInstantiationProcessor>();
    }
}
