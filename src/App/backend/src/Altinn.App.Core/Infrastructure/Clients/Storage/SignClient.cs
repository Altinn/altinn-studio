using System.Net.Http.Headers;
using System.Net.Http.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

/// <summary>
/// Implementation of <see cref="ISignClient"/> that sends signing requests to platform
/// </summary>
public class SignClient : ISignClient
{
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;
    private readonly HttpClient _client;
    private readonly IInstanceLocker _instanceLocker;

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    /// <summary>
    /// Create a new instance of <see cref="SignClient"/>
    /// </summary>
    /// <param name="httpClient">HttpClient used to send requests</param>
    /// <param name="serviceProvider">The service provider.</param>
    public SignClient(HttpClient httpClient, IServiceProvider serviceProvider)
    {
        var platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;

        httpClient.BaseAddress = new Uri(platformSettings.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        _client = httpClient;
        _authenticationTokenResolver = serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();
        _instanceLocker = serviceProvider.GetRequiredService<IInstanceLocker>();
    }

    /// <inheritdoc/>
    public async Task SignDataElements(
        SignatureContext signatureContext,
        StorageAuthenticationMethod? authenticationMethod = null
    )
    {
        string apiUrl = $"instances/{signatureContext.InstanceIdentifier}/sign";
        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod
        );
        HttpResponseMessage response = await _client.PostAsync(
            token,
            apiUrl,
            BuildSignRequest(signatureContext),
            lockToken: _instanceLocker.CurrentLockToken
        );
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        throw new PlatformHttpException(response, "Failed to sign dataelements");
    }

    private static JsonContent BuildSignRequest(SignatureContext signatureContext)
    {
        SignRequest signRequest = new SignRequest()
        {
            Signee = new()
            {
                UserId = signatureContext.Signee.UserId,
                PersonNumber = signatureContext.Signee.PersonNumber,
                OrganisationNumber = signatureContext.Signee.OrganisationNumber,
                SystemUserId = signatureContext.Signee.SystemUserId,
            },
            SignatureDocumentDataType = signatureContext.SigneeStatesDataTypeId,
            DataElementSignatures = new(),
            GeneratedFromTask = signatureContext.GeneratedFromTask,
        };
        foreach (var dataElementSignature in signatureContext.DataElementSignatures)
        {
            signRequest.DataElementSignatures.Add(
                new SignRequest.DataElementSignature()
                {
                    DataElementId = dataElementSignature.DataElementId,
                    Signed = dataElementSignature.Signed,
                }
            );
        }

        return JsonContent.Create(signRequest);
    }
}
