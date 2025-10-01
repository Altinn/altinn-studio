using System.Net.Http.Headers;
using System.Net.Http.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Sign;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Storage;

/// <summary>
/// Implementation of <see cref="ISignClient"/> that sends signing requests to platform
/// </summary>
public class SignClient : ISignClient
{
    private readonly IUserTokenProvider _userTokenProvider;
    private readonly HttpClient _client;

    /// <summary>
    /// Create a new instance of <see cref="SignClient"/>
    /// </summary>
    /// <param name="platformSettings">Platform settings, used to get storage endpoint</param>
    /// <param name="httpClient">HttpClient used to send requests</param>
    /// <param name="userTokenProvider">Service that can provide user token</param>
    public SignClient(
        IOptions<PlatformSettings> platformSettings,
        HttpClient httpClient,
        IUserTokenProvider userTokenProvider
    )
    {
        var platformSettings1 = platformSettings.Value;

        httpClient.BaseAddress = new Uri(platformSettings1.ApiStorageEndpoint);
        httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings1.SubscriptionKey);
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xml"));
        _client = httpClient;
        _userTokenProvider = userTokenProvider;
    }

    /// <inheritdoc/>
    public async Task SignDataElements(SignatureContext signatureContext)
    {
        string apiUrl = $"instances/{signatureContext.InstanceIdentifier}/sign";
        string token = _userTokenProvider.GetUserToken();
        HttpResponseMessage response = await _client.PostAsync(token, apiUrl, BuildSignRequest(signatureContext));
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
