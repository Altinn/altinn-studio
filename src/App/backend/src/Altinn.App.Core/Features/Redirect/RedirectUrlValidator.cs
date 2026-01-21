using System.Text;
using Altinn.App.Core.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Redirect;

/// <inheritdoc />
internal sealed class RedirectUrlValidator(IOptions<GeneralSettings> settings) : IRedirectUrlValidator
{
    private readonly GeneralSettings _settings = settings.Value;

    /// <inheritdoc />
    public RedirectUrlValidationResult Validate(string? base64Url)
    {
        if (string.IsNullOrEmpty(base64Url))
        {
            return RedirectUrlValidationResult.InvalidFormat(
                "Invalid value of query parameter url. The query parameter url must not be empty or null."
            );
        }

        try
        {
            var byteArrayUri = Convert.FromBase64String(base64Url);
            var convertedUri = Encoding.UTF8.GetString(byteArrayUri);
            Uri uri = new Uri(convertedUri);

            if (!IsValidRedirectUri(uri.Host))
            {
                return RedirectUrlValidationResult.InvalidDomain("Invalid domain from query parameter url.");
            }

            return RedirectUrlValidationResult.Success(convertedUri);
        }
        catch (FormatException)
        {
            return RedirectUrlValidationResult.InvalidFormat(
                "Invalid format of query parameter url. The query parameter url must be a valid base64 encoded string"
            );
        }
    }

    private bool IsValidRedirectUri(string urlHost)
    {
        string validHost = _settings.HostName;
        int segments = _settings.HostName.Split('.').Length;

        List<string> goToList = Enumerable
            .Reverse(new List<string>(urlHost.Split('.')))
            .Take(segments)
            .Reverse()
            .ToList();
        string redirectHost = string.Join(".", goToList);

        return validHost.Equals(redirectHost, StringComparison.OrdinalIgnoreCase);
    }
}
