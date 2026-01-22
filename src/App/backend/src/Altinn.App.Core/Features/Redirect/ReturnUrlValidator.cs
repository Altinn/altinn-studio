using System.Text;
using Altinn.App.Core.Configuration;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Redirect;

/// <inheritdoc />
internal sealed class ReturnUrlValidator(IOptions<GeneralSettings> settings) : IReturnUrlValidator
{
    private readonly GeneralSettings _settings = settings.Value;

    /// <inheritdoc />
    public ReturnUrlValidationResult Validate(string? base64Url)
    {
        if (string.IsNullOrEmpty(base64Url))
        {
            return ReturnUrlValidationResult.InvalidFormat("The query parameter returnUrl must not be empty or null.");
        }

        try
        {
            var byteArrayUri = Convert.FromBase64String(base64Url);
            var convertedUri = Encoding.UTF8.GetString(byteArrayUri);
            Uri uri = new Uri(convertedUri);

            if (!IsValidRedirectUri(uri.Host))
            {
                return ReturnUrlValidationResult.InvalidDomain("Invalid domain from returnUrl query parameter.");
            }

            return ReturnUrlValidationResult.Success(convertedUri);
        }
        catch (FormatException)
        {
            return ReturnUrlValidationResult.InvalidFormat(
                "The query parameter returnUrl must be a valid base64 encoded string"
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
