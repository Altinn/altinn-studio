using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Creates users in Gitea by making an API call with X-WEBAUTH-USER header,
/// which triggers Gitea's reverse-proxy auto-registration.
/// </summary>
public class GiteaUserProvisioningService(HttpClient httpClient) : IUserProvisioningService
{
    public async Task EnsureUserExistsAsync(
        string username,
        string? fullName = null,
        CancellationToken cancellationToken = default
    )
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "user");
        request.Headers.TryAddWithoutValidation("X-WEBAUTH-USER", username);

        if (!string.IsNullOrWhiteSpace(fullName))
        {
            request.Headers.TryAddWithoutValidation("X-WEBAUTH-FULLNAME", GiteaAuthHeadersProvider.ToAscii(fullName));
        }

        await httpClient.SendAsync(request, cancellationToken);
    }
}
