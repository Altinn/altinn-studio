using System.Diagnostics;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using KS.Fiks.IO.Client.Configuration;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Crypto.Configuration;
using KS.Fiks.IO.Send.Client.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;
using RabbitMQ.Client.Events;
using FiksResult = Altinn.App.Core.Features.Telemetry.Fiks.FiksResult;
using IExternalFiksIOClient = KS.Fiks.IO.Client.IFiksIOClient;

namespace Altinn.App.Clients.Fiks.FiksIO;

internal sealed class FiksIOClient : IFiksIOClient
{
    private readonly IOptionsMonitor<FiksIOSettings> _fiksIOSettings;
    private readonly IAppMetadata _appMetadata;
    private readonly IHostEnvironment _env;
    private readonly ILogger<FiksIOClient> _logger;
    private readonly ResiliencePipeline<FiksIOMessageResponse> _resiliencePipeline;
    private IExternalFiksIOClient? _fiksIoClient;
    private readonly Telemetry? _telemetry;
    private readonly IFiksIOClientFactory _fiksIOClientFactory;
    private event Func<FiksIOReceivedMessage, Task>? _messageReceivedHandler;
    private bool _isDisposed;

    private string _defaultApiHost => _env.IsProduction() ? ApiConfiguration.ProdHost : ApiConfiguration.TestHost;
    private string _defaultAmqpHost => _env.IsProduction() ? AmqpConfiguration.ProdHost : AmqpConfiguration.TestHost;

    public IFiksIOAccountSettings AccountSettings => _fiksIOSettings.CurrentValue;

    public FiksIOClient(
        IServiceProvider serviceProvider,
        IOptionsMonitor<FiksIOSettings> fiksIOSettings,
        IHostEnvironment env,
        IAppMetadata appMetadata,
        ILogger<FiksIOClient> logger,
        IFiksIOClientFactory fiksIOClientFactory,
        Telemetry? telemetry = null
    )
    {
        _fiksIOSettings = fiksIOSettings;
        _appMetadata = appMetadata;
        _env = env;
        _logger = logger;
        _fiksIOClientFactory = fiksIOClientFactory;
        _resiliencePipeline = serviceProvider.ResolveResiliencePipeline();
        _telemetry = telemetry;

        if (fiksIOSettings.CurrentValue is null)
            throw new FiksIOConfigurationException("Fiks IO has not been configured");

        // Subscribe to settings changes
        fiksIOSettings.OnChange(InitialiseFiksIOClient_NeverThrowsWrapper);
    }

    public async Task<FiksIOMessageResponse> SendMessage(
        FiksIOMessageRequest request,
        CancellationToken cancellationToken = default
    )
    {
        using Activity? activity = _telemetry?.StartSendFiksActivity(
            request.Recipient,
            request.MessageType,
            request.SendersReference,
            request.InReplyToMessage,
            request.CorrelationId
        );

        _logger.LogInformation(
            "Sending Fiks IO message {MessageType}:{ClientMessageId}",
            request.MessageType,
            request.SendersReference
        );

        var numAttempts = 0;

        try
        {
            ResilienceContext context = ResilienceContextPool.Shared.Get(cancellationToken);
            context.Properties.Set(
                new ResiliencePropertyKey<FiksIOMessageRequest>(FiksIOConstants.MessageRequestPropertyKey),
                request
            );

            FiksIOMessageResponse result = await _resiliencePipeline.ExecuteAsync(
                async context =>
                {
                    if (_fiksIoClient is null || await _fiksIoClient.IsOpenAsync() is false)
                        _fiksIoClient = await InitializeFiksIOClient();

                    numAttempts += 1;

                    var externalResult = await _fiksIoClient.Send(
                        request.ToMeldingRequest(AccountSettings.AccountId),
                        request.ToPayload(),
                        cancellationToken
                    );
                    var result = new FiksIOMessageResponse(externalResult);
                    _logger.LogInformation("FiksIO message sent successfully: {MessageDetails}", result);

                    return result;
                },
                context
            );

            activity?.AddTag(Telemetry.Labels.FiksMessageId, result.MessageId);
            _telemetry?.RecordFiksMessageSent(FiksResult.Success);

            return result;
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Failed to send message {MessageType}:{ClientMessageId} after {NumRetries} attempts: {Exception}",
                request.MessageType,
                request.SendersReference,
                numAttempts,
                e.Message
            );
            _telemetry?.RecordFiksMessageSent(FiksResult.Error);
            activity?.Errored(e);
            throw;
        }
    }

    public async Task OnMessageReceived(Func<FiksIOReceivedMessage, Task> listener)
    {
        bool alreadySubscribed = _messageReceivedHandler is not null;
        _messageReceivedHandler = listener; // Always update the handler

        if (alreadySubscribed)
            return;

        if (_fiksIoClient is null)
            await InitializeFiksIOClient();
        else
            await SubscribeToEvents();
    }

    public async Task<bool> IsHealthy()
    {
        if (_fiksIoClient is null)
            return false;

        return await _fiksIoClient.IsOpenAsync();
    }

    public Task Reconnect() => InitializeFiksIOClient();

    internal async Task<IExternalFiksIOClient> InitializeFiksIOClient()
    {
        ObjectDisposedException.ThrowIf(_isDisposed, this);

        var fiksIOSettings = _fiksIOSettings.CurrentValue;
        var appMeta = await _appMetadata.GetApplicationMetadata();

        var apiHostUri = GetUri(fiksIOSettings.ApiHost);
        var amqpHostUri = GetUri(fiksIOSettings.AmqpHost);

        var fiksConfiguration = new FiksIOConfiguration(
            amqpConfiguration: new AmqpConfiguration(
                amqpHostUri?.Host ?? _defaultAmqpHost,
                amqpHostUri?.Port > -1 ? amqpHostUri.Port : 5671,
                applicationName: GetFiksAmqpApplicationName(appMeta.AppIdentifier),
                prefetchCount: 0
            ),
            apiConfiguration: new ApiConfiguration(
                apiHostUri?.Scheme ?? "https",
                apiHostUri?.Host ?? _defaultApiHost,
                apiHostUri?.Port > -1 ? apiHostUri.Port : 443
            ),
            asiceSigningConfiguration: new AsiceSigningConfiguration(GenerateAsiceCertificate()),
            integrasjonConfiguration: new IntegrasjonConfiguration(
                fiksIOSettings.IntegrationId,
                fiksIOSettings.IntegrationPassword
            ),
            kontoConfiguration: new KontoConfiguration(fiksIOSettings.AccountId, fiksIOSettings.AccountPrivateKey)
        );

        if (_fiksIoClient is not null)
            await _fiksIoClient.DisposeAsync();

        _fiksIoClient = await _fiksIOClientFactory.CreateClient(fiksConfiguration);

        if (_messageReceivedHandler is not null)
            await SubscribeToEvents();

        return _fiksIoClient;
    }

    private async void InitialiseFiksIOClient_NeverThrowsWrapper(object? x = null)
    {
        try
        {
            await InitializeFiksIOClient();
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Failed to initialise Fiks IO client: {ErrorMessage}", e.Message);
        }
    }

    private async Task SubscribeToEvents()
    {
        ObjectDisposedException.ThrowIf(_isDisposed, this);

        if (_fiksIoClient is null)
            return;

        await _fiksIoClient.NewSubscriptionAsync(MessageReceivedHandler, SubscriptionCancelledHandler);
    }

    private async Task MessageReceivedHandler(MottattMeldingArgs eventArgs)
    {
        if (_messageReceivedHandler is null)
            return;

        await _messageReceivedHandler.Invoke(new FiksIOReceivedMessage(eventArgs));
    }

    private Task SubscriptionCancelledHandler(ConsumerEventArgs eventArgs)
    {
        InitialiseFiksIOClient_NeverThrowsWrapper();
        return Task.CompletedTask;
    }

    private static string GetFiksAmqpApplicationName(AppIdentifier appIdentifier) =>
        $"altinn-studio-app-{appIdentifier.Org}-{appIdentifier.App}";

    private static Uri? GetUri(string? uriString) => !string.IsNullOrWhiteSpace(uriString) ? new Uri(uriString) : null;

    internal static X509Certificate2 GenerateAsiceCertificate()
    {
        using RSA rsa = RSA.Create(4096);

        var subject = new X500DistinguishedName($"CN={Guid.NewGuid()}");
        var request = new CertificateRequest(subject, rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        var certificate = request.CreateSelfSigned(
            DateTimeOffset.UtcNow.AddDays(-5), // Don't want to get stuck on a clock issue here...
            DateTimeOffset.UtcNow.AddYears(5)
        );

        return certificate;
    }

    internal IExternalFiksIOClient? GetUnderlyingFiksIOClient() => _fiksIoClient;

    public async ValueTask DisposeAsync()
    {
        if (_isDisposed)
            return;

        _isDisposed = true;

        if (_fiksIoClient is not null)
            await _fiksIoClient.DisposeAsync();
    }
}
