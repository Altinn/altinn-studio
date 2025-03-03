using Altinn.App.Api.Controllers;
using Altinn.App.Api.Helpers.Patch;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Validation;
using Altinn.Common.PEP.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using IProcessEngine = Altinn.App.Core.Internal.Process.IProcessEngine;

namespace Altinn.App.Api.Tests.Controllers;

internal sealed record InstancesControllerFixture(IServiceProvider ServiceProvider) : IDisposable
{
    public Mock<T> Mock<T>()
        where T : class => Moq.Mock.Get(ServiceProvider.GetRequiredService<T>());

    public void VerifyNoOtherCalls(
        bool verifyDataClient = true,
        bool verifyAppModel = true,
        bool verifyInstantiationProcessor = true,
        bool verifyPrefill = true
    )
    {
        Mock<IAltinnPartyClient>().VerifyNoOtherCalls();
        Mock<IInstanceClient>().VerifyNoOtherCalls();
        if (verifyDataClient)
            Mock<IDataClient>().VerifyNoOtherCalls();
        Mock<IAppMetadata>().VerifyNoOtherCalls();
        if (verifyAppModel)
            Mock<IAppModel>().VerifyNoOtherCalls();
        if (verifyInstantiationProcessor)
            Mock<IInstantiationProcessor>().VerifyNoOtherCalls();
        Mock<IInstantiationValidator>().VerifyNoOtherCalls();
        Mock<IPDP>().VerifyNoOtherCalls();
        Mock<IEventsClient>().VerifyNoOtherCalls();
        if (verifyPrefill)
            Mock<IPrefill>().VerifyNoOtherCalls();
        Mock<IProfileClient>().VerifyNoOtherCalls();
        Mock<IProcessEngine>().VerifyNoOtherCalls();
    }

    public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();

    internal static InstancesControllerFixture Create()
    {
        var services = new ServiceCollection();
        services.AddLogging(logging => logging.AddProvider(NullLoggerProvider.Instance));
        services.AddOptions<AppSettings>().Configure(_ => { });
        services.AddAppImplementationFactory();

        services.AddSingleton(new Mock<IAltinnPartyClient>().Object);
        services.AddSingleton(new Mock<IInstanceClient>().Object);
        services.AddSingleton(new Mock<IDataClient>().Object);
        services.AddSingleton(new Mock<IAppMetadata>().Object);
        services.AddSingleton(new Mock<IAppModel>().Object);
        services.AddSingleton(new Mock<IInstantiationProcessor>().Object);
        services.AddSingleton(new Mock<IInstantiationValidator>().Object);
        services.AddSingleton(new Mock<IPDP>().Object);
        services.AddSingleton(new Mock<IEventsClient>().Object);
        services.AddSingleton(new Mock<IPrefill>().Object);
        services.AddSingleton(new Mock<IProfileClient>().Object);
        services.AddSingleton(new Mock<IProcessEngine>().Object);
        services.AddSingleton(new Mock<IOrganizationClient>().Object);
        services.AddSingleton(new Mock<IHostEnvironment>().Object);
        services.AddSingleton(new Mock<IValidationService>().Object);
        services.AddSingleton(new Mock<IAppResources>(MockBehavior.Strict).Object);

        var httpContextMock = new Mock<HttpContext>();
        services.AddTransient(_ => httpContextMock.Object);

        services.AddTransient<InternalPatchService>();
        services.AddTransient<ModelSerializationService>();
        services.AddTransient<InstanceDataUnitOfWorkInitializer>();

        services.AddTransient(sp =>
        {
            var controller = ActivatorUtilities.CreateInstance<InstancesController>(sp);
            controller.ControllerContext = new() { HttpContext = httpContextMock.Object };
            return controller;
        });

        var serviceProvider = services.BuildStrictServiceProvider();
        return new(serviceProvider);
    }
}
