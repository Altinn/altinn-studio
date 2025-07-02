using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Helpers.Patch;
using Altinn.App.Api.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Prefill;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.Common.PEP.Interfaces;
using FluentAssertions;
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

    public static async Task<(InstanceResponse Instance, string Response)> CreateInstanceSimplified(
        string org,
        string app,
        int instanceOwnerPartyId,
        HttpClient client,
        string token,
        Dictionary<string, string>? prefill = null
    )
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        prefill ??= new();

        // Create instance data
        var body = $$"""
                {
                    "prefill": {{JsonSerializer.Serialize(prefill)}},
                    "instanceOwner": {
                        "partyId": "{{instanceOwnerPartyId}}"
                    }
                }
            """;
        using var content = new StringContent(body, Encoding.UTF8, "application/json");

        // Create instance
        using var createResponse = await client.PostAsync($"{org}/{app}/instances/create", content);
        var createResponseContent = await createResponse.Content.ReadAsStringAsync();
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created, createResponseContent);

        var createResponseParsed = JsonSerializer.Deserialize<InstanceResponse>(
            createResponseContent,
            ApiTestBase.JsonSerializerOptions
        );
        Assert.NotNull(createResponseParsed);

        // Verify Data id
        var instanceId = createResponseParsed.Id;
        instanceId.Should().NotBeNullOrWhiteSpace();
        return (createResponseParsed, createResponseContent);
    }

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

    internal static InstancesControllerFixture Create(Authenticated? auth = null)
    {
        var services = new ServiceCollection();
        services.AddLogging(logging => logging.AddProvider(NullLoggerProvider.Instance));
        services.AddOptions<AppSettings>().Configure(_ => { });
        services.AddAppImplementationFactory();

        services.AddSingleton(new Mock<IAltinnPartyClient>().Object);
        services.AddSingleton(new Mock<IRegisterClient>().Object);
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
        services.AddSingleton(new Mock<ITranslationService>().Object);
        services.AddSingleton(new Mock<IAppResources>(MockBehavior.Strict).Object);

        var httpContextMock = new Mock<HttpContext>();
        services.AddTransient(_ => httpContextMock.Object);

        services.AddTransient<InternalPatchService>();
        services.AddTransient<ModelSerializationService>();
        services.AddTransient<InstanceDataUnitOfWorkInitializer>();

        Mock<IAuthenticationContext> authenticationContextMock = new();
        services.AddSingleton(authenticationContextMock.Object);
        if (auth is not null)
            authenticationContextMock.Setup(m => m.Current).Returns(auth);

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
