using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace Altinn.Studio.Designer.Configuration;

public sealed class MockportenSettings
{
    public bool Enabled { get; set; }
    public string MetadataAddress { get; set; } =
        "https://mockporten.azurewebsites.net/api/v1/openid/.well-known/openid-configuration";
    public string Issuer { get; set; } = "https://mockporten.azurewebsites.net/authorization";
    public string ClientId { get; set; } = "altinn-studio";
    public List<MockportenUser> Users { get; set; } = [];

    public void Validate()
    {
        if (!Enabled)
        {
            return;
        }

        if (!IsHttpsUrl(MetadataAddress) || !IsHttpsUrl(Issuer) || string.IsNullOrWhiteSpace(ClientId))
        {
            throw new InvalidOperationException("Mockporten requires HTTPS metadata and issuer URLs and a client ID.");
        }

        if (
            Users.Any(user =>
                !Regex.IsMatch(user.PidHash, "^[a-f0-9]{64}$")
                || !Regex.IsMatch(user.Username, "^mockporten-[a-z0-9][a-z0-9-]{0,28}$")
            )
            || Users.Select(user => user.PidHash).Distinct().Count() != Users.Count
            || Users.Select(user => user.Username).Distinct().Count() != Users.Count
        )
        {
            throw new InvalidOperationException(
                "Mockporten users require unique PID hashes and unique lowercase mockporten- usernames (maximum 40 characters)."
            );
        }
    }

    private static bool IsHttpsUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttps
        && string.IsNullOrEmpty(uri.UserInfo);
}

public sealed class MockportenUser
{
    public string PidHash { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
}
