using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Platform.Register.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Infrastructure.Clients.Register;

/// <summary>
/// Represents an implementation of <see cref="IPersonClient"/> that will call the Register
/// component to retrieve person information.
/// </summary>
public class PersonClient : IPersonClient
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient;
    private readonly IAppMetadata _appMetadata;
    private readonly IAccessTokenGenerator _accessTokenGenerator;
    private readonly IAuthenticationTokenResolver _authenticationTokenResolver;

    private readonly AuthenticationMethod _defaultAuthenticationMethod = StorageAuthenticationMethod.CurrentUser();

    /// <summary>
    /// Initializes a new instance of the <see cref="PersonClient"/> class.
    /// </summary>
    /// <param name="httpClient">The HttpClient to be used to send requests to Register.</param>
    /// <param name="serviceProvider">The service provider.</param>
    public PersonClient(HttpClient httpClient, IServiceProvider serviceProvider)
    {
        _httpClient = httpClient;

        var platformSettings = serviceProvider.GetRequiredService<IOptions<PlatformSettings>>().Value;
        _httpClient.BaseAddress = new Uri(platformSettings.ApiRegisterEndpoint);
        _httpClient.DefaultRequestHeaders.Add(General.SubscriptionKeyHeaderName, platformSettings.SubscriptionKey);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        _accessTokenGenerator = serviceProvider.GetRequiredService<IAccessTokenGenerator>();
        _authenticationTokenResolver = serviceProvider.GetRequiredService<IAuthenticationTokenResolver>();
        _appMetadata = serviceProvider.GetRequiredService<IAppMetadata>();
    }

    /// <inheritdoc/>
    public async Task<Person?> GetPerson(
        string nationalIdentityNumber,
        string lastName,
        StorageAuthenticationMethod? authenticationMethod = null,
        CancellationToken ct = default
    )
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"persons");
        await AddAuthHeaders(request, authenticationMethod);

        request.Headers.Add("X-Ai-NationalIdentityNumber", nationalIdentityNumber);
        request.Headers.Add("X-Ai-LastName", ConvertToBase64(lastName));

        var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseContentRead, ct);

        return await ReadResponse(response, ct);
    }

    private async Task AddAuthHeaders(HttpRequestMessage request, StorageAuthenticationMethod? authenticationMethod)
    {
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        string issuer = application.Org;
        string appName = application.AppIdentifier.App;
        request.Headers.Add(
            General.PlatformAccessTokenHeaderName,
            _accessTokenGenerator.GenerateAccessToken(issuer, appName)
        );
        JwtToken token = await _authenticationTokenResolver.GetAccessToken(
            authenticationMethod ?? _defaultAuthenticationMethod
        );
        request.Headers.Authorization = new AuthenticationHeaderValue(AuthorizationSchemes.Bearer, token);
    }

    private static async Task<Person?> ReadResponse(HttpResponseMessage response, CancellationToken ct)
    {
        if (response.StatusCode == HttpStatusCode.OK)
        {
            return await response.Content.ReadFromJsonAsync<Person>(_jsonSerializerOptions, ct);
        }

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }

        throw await PlatformHttpException.CreateAsync(response);
    }

    private static string ConvertToBase64(string text)
    {
        var bytes = Encoding.UTF8.GetBytes(text);
        return Convert.ToBase64String(bytes);
    }
}
