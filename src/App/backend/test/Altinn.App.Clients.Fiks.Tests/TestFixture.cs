using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.AltinnCdn;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Polly;

namespace Altinn.App.Clients.Fiks.Tests;

/// <summary>
/// Test fixture for FiksIO and FiksArkiv.
/// Sets up mocks for external dependencies, but not for FiksIO/Arkiv implementations.
/// <p>Use the <see cref="Action{IServiceCollection}"/> delegate in the <see cref="Create"/> metod to register
/// <see cref="Fiks.Extensions.ServiceCollectionExtensions.AddFiksIOClient"/> or <see cref="Fiks.Extensions.ServiceCollectionExtensions.AddFiksArkiv"/>
/// along with any additional services and mocks.</p>
/// </summary>
internal sealed record TestFixture(
    WebApplication App,
    Mock<IHostEnvironment> HostEnvironmentMock,
    Mock<IAppMetadata> AppMetadataMock,
    Mock<IMaskinportenClient> MaskinportenClientMock,
    Mock<ILoggerFactory> LoggerFactoryMock,
    Mock<IDataClient> DataClientMock,
    Mock<IInstanceClient> InstanceClientMock,
    Mock<IAppResources> AppResourcesMock,
    Mock<IAppModel> AppModelMock,
    Mock<IAuthenticationContext> AuthenticationContextMock,
    Mock<IAltinnPartyClient> PartyClientMock,
    Mock<ILayoutEvaluatorStateInitializer> LayoutStateInitializerMock,
    Mock<IEmailNotificationClient> EmailNotificationClientMock,
    Mock<IProcessReader> ProcessReaderMock,
    Mock<IHttpClientFactory> HttpClientFactoryMock,
    Mock<HttpMessageHandler> HttpMessageHandlerMock,
    Mock<IAccessTokenGenerator> AccessTokenGeneratorMock,
    Mock<ITranslationService> TranslationServiceMock,
    Mock<IFiksIOClientFactory> FiksIOClientFactoryMock
) : IAsyncDisposable
{
    public IConfigurationRoot ConfigurationRoot => (IConfigurationRoot)App.Configuration;
    public FiksIOClient FiksIOClient => (FiksIOClient)App.Services.GetRequiredService<IFiksIOClient>();
    public FiksIOSettings FiksIOSettings => App.Services.GetRequiredService<IOptions<FiksIOSettings>>().Value;
    public FiksArkivSettings FiksArkivSettings => App.Services.GetRequiredService<IOptions<FiksArkivSettings>>().Value;
    public MaskinportenSettings MaskinportenSettings =>
        App.Services.GetRequiredService<IOptions<MaskinportenSettings>>().Value;
    public FiksArkivConfigValidationService FiksArkivConfigValidationService =>
        App.Services.GetServices<IHostedService>().OfType<FiksArkivConfigValidationService>().Single();
    public FiksArkivHost FiksArkivHost => App.Services.GetServices<IHostedService>().OfType<FiksArkivHost>().Single();
    public IAltinnCdnClient AltinnCdnClient => App.Services.GetRequiredService<IAltinnCdnClient>();
    public IFiksArkivResponseHandler FiksArkivResponseHandler =>
        App.Services.GetRequiredService<IFiksArkivResponseHandler>();
    public IFiksArkivPayloadGenerator FiksArkivPayloadGenerator =>
        App.Services.GetRequiredService<IFiksArkivPayloadGenerator>();
    public IFiksArkivConfigResolver FiksArkivConfigResolver =>
        App.Services.GetRequiredService<IFiksArkivConfigResolver>();
    public IFiksArkivInstanceClient FiksArkivInstanceClient =>
        App.Services.GetRequiredService<IFiksArkivInstanceClient>();
    public IServiceTask FiksArkivServiceTask =>
        AppImplementationFactory.GetAll<IServiceTask>().First(x => x.Type == AltinnTaskTypes.FiksArkiv);
    public ResiliencePipeline<FiksIOMessageResponse> FiksIOResiliencePipeline =>
        App.Services.ResolveResiliencePipeline();
    public IFiksIOClientFactory FiksIOClientFactory => App.Services.GetRequiredService<IFiksIOClientFactory>();
    public IProcessReader ProcessReader => App.Services.GetRequiredService<IProcessReader>();
    public IHttpClientFactory HttpClientFactory => App.Services.GetRequiredService<IHttpClientFactory>();
    public IAccessTokenGenerator AccessTokenGenerator => App.Services.GetRequiredService<IAccessTokenGenerator>();
    public IAppMetadata AppMetadata => App.Services.GetRequiredService<IAppMetadata>();
    public AppImplementationFactory AppImplementationFactory =>
        App.Services.GetRequiredService<AppImplementationFactory>();

    private static JsonSerializerOptions _jsonSerializerOptions =>
        new() { DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };

    /// <summary>
    /// Creates a new test fixture instance
    /// </summary>
    public static TestFixture Create(
        Action<IServiceCollection> configureServices,
        IEnumerable<(string, object)>? configurationCollection = null,
        bool useDefaultFiksIOSettings = true,
        bool useDefaultFiksArkivSettings = true,
        bool useDefaultMaskinportenSettings = true,
        string hostEnvironment = "Development",
        bool mockFiksIOClientFactory = true
    )
    {
        var builder = WebApplication.CreateBuilder();

        // Default configuration values
        if (useDefaultFiksIOSettings)
            builder.Configuration.AddJsonStream(GetJsonStream("FiksIOSettings", TestHelpers.DefaultFiksIOSettings));

        if (useDefaultFiksArkivSettings)
            builder.Configuration.AddJsonStream(
                GetJsonStream("FiksArkivSettings", TestHelpers.DefaultFiksArkivSettings)
            );

        if (useDefaultMaskinportenSettings)
        {
            builder.Configuration.AddJsonStream(
                GetJsonStream("MaskinportenSettings", TestHelpers.DefaultMaskinportenSettings)
            );
            builder.Services.ConfigureMaskinportenClient("MaskinportenSettings");
        }

        // User supplied configuration values
        if (configurationCollection is not null)
            builder.Configuration.AddJsonStream(GetJsonStream(configurationCollection));

        // User-supplied services configuration
        configureServices(builder.Services);

        // Mocks
        var hostEnvironmentMock = new Mock<IHostEnvironment>();
        var appMetadataMock = new Mock<IAppMetadata>();
        var maskinportenClientMock = new Mock<IMaskinportenClient>();
        var dataClientMock = new Mock<IDataClient>();
        var instanceClientMock = new Mock<IInstanceClient>();
        var appResourcesMock = new Mock<IAppResources>();
        var appModelMock = new Mock<IAppModel>();
        var authenticationContextMock = new Mock<IAuthenticationContext>();
        var partyClientMock = new Mock<IAltinnPartyClient>();
        var layoutStateInitializerMock = new Mock<ILayoutEvaluatorStateInitializer>();
        var emailNotificationClientMock = new Mock<IEmailNotificationClient>();
        var processReaderMock = new Mock<IProcessReader>();
        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        var httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        var accessTokenGeneratorMock = new Mock<IAccessTokenGenerator>();
        var loggerFactoryMock = new Mock<ILoggerFactory>();
        var translationServiceMock = new Mock<ITranslationService>();
        var fiksIOClientFactoryMock = new Mock<IFiksIOClientFactory>();

        httpMessageHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(
                (HttpRequestMessage request, CancellationToken _) =>
                {
                    if (!TestHelpers.IsTokenRequest(request))
                        throw new Exception("Default HttpMessageHandler mock only handles token requests");

                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(TestHelpers.DummyToken),
                    };
                }
            );

        httpClientFactoryMock
            .Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(() => new HttpClient(httpMessageHandlerMock.Object));
        hostEnvironmentMock.Setup(x => x.EnvironmentName).Returns(hostEnvironment);
        loggerFactoryMock.Setup(x => x.CreateLogger(It.IsAny<string>())).Returns(Mock.Of<ILogger>());
        appMetadataMock
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("ttd/unit-testing"));

        builder.Services.AddSingleton(hostEnvironmentMock.Object);
        builder.Services.AddSingleton(appMetadataMock.Object);
        builder.Services.AddSingleton(maskinportenClientMock.Object);
        builder.Services.AddSingleton(loggerFactoryMock.Object);
        builder.Services.AddSingleton(dataClientMock.Object);
        builder.Services.AddSingleton(authenticationContextMock.Object);
        builder.Services.AddSingleton(partyClientMock.Object);
        builder.Services.AddSingleton(layoutStateInitializerMock.Object);
        builder.Services.AddSingleton(emailNotificationClientMock.Object);
        builder.Services.AddSingleton(appResourcesMock.Object);
        builder.Services.AddSingleton(instanceClientMock.Object);
        builder.Services.AddSingleton(appModelMock.Object);
        builder.Services.AddSingleton(processReaderMock.Object);
        builder.Services.AddSingleton(httpClientFactoryMock.Object);
        builder.Services.AddSingleton(accessTokenGeneratorMock.Object);
        builder.Services.AddSingleton(translationServiceMock.Object);

        if (mockFiksIOClientFactory)
            builder.Services.AddSingleton(fiksIOClientFactoryMock.Object);

        // Non-mockable services
        builder.Services.AddTransient<IAuthenticationTokenResolver, AuthenticationTokenResolver>();
        builder.Services.AddTransient<InstanceDataUnitOfWorkInitializer>();
        builder.Services.AddSingleton<ModelSerializationService>();
        builder.Services.AddAppImplementationFactory();
        builder.Services.AddRuntimeEnvironment();

        return new TestFixture(
            builder.Build(),
            hostEnvironmentMock,
            appMetadataMock,
            maskinportenClientMock,
            loggerFactoryMock,
            dataClientMock,
            instanceClientMock,
            appResourcesMock,
            appModelMock,
            authenticationContextMock,
            partyClientMock,
            layoutStateInitializerMock,
            emailNotificationClientMock,
            processReaderMock,
            httpClientFactoryMock,
            httpMessageHandlerMock,
            accessTokenGeneratorMock,
            translationServiceMock,
            mockFiksIOClientFactory ? fiksIOClientFactoryMock : null!
        );
    }

    private static Stream GetJsonStream(string key, object data)
    {
        var dict = new Dictionary<string, object> { { key, data } };
        var json = JsonSerializer.Serialize(dict, _jsonSerializerOptions);
        return new MemoryStream(Encoding.UTF8.GetBytes(json));
    }

    private static Stream GetJsonStream(IDictionary<string, object> data)
    {
        var json = JsonSerializer.Serialize(data, _jsonSerializerOptions);
        return new MemoryStream(Encoding.UTF8.GetBytes(json));
    }

    private static Stream GetJsonStream(IEnumerable<(string, object)> data)
    {
        var json = JsonSerializer.Serialize(data.ToDictionary(x => x.Item1, x => x.Item2), _jsonSerializerOptions);
        return new MemoryStream(Encoding.UTF8.GetBytes(json));
    }

    public async ValueTask DisposeAsync()
    {
        await App.DisposeAsync();
    }
}
