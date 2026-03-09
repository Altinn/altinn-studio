using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Altinn.Studio.Designer.Services.Implementation;

public class GiteaDbStudioOidcUsernameProvider(
    DesignerdbContext designerDb,
    GiteaDbSettings giteaDbSettings,
    TimeProvider timeProvider
) : IStudioOidcUsernameProvider
{
    private const string GiteaLookupQuery = """
        SELECT u.lower_name
        FROM external_login_user elu
        JOIN "user" u ON elu.user_id = u.id
        WHERE elu.external_id = @sub
        LIMIT 1
        """;

    private const int MaxGiteaUsernameLength = 40;
    private const int RandomSuffixLength = 4;

    public async Task<string> ResolveUsernameAsync(string sub, PidHash pidHash, string? givenName, string? familyName)
    {
        string pidHashValue = pidHash.Value;

        // Step 1: Check Designer DB mapping
        var mapping = await designerDb.UserAccounts.FirstOrDefaultAsync(m => m.PidHash == pidHashValue);

        if (mapping != null)
        {
            return mapping.Username;
        }

        // Step 2: Check Gitea DB by sub
        string? giteaUsername = await LookupGiteaUsernameAsync(sub);
        if (giteaUsername != null)
        {
            await StoreMapping(pidHash, giteaUsername);
            return giteaUsername;
        }

        // Step 3: Generate new username
        string generatedUsername = GenerateUsername(givenName, familyName);
        await StoreMapping(pidHash, generatedUsername);
        return generatedUsername;
    }

    private async Task<string?> LookupGiteaUsernameAsync(string sub)
    {
        await using var connection = new NpgsqlConnection(giteaDbSettings.ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(GiteaLookupQuery, connection);
        command.Parameters.AddWithValue("sub", sub);

        var result = await command.ExecuteScalarAsync();
        return result as string;
    }

    private async Task StoreMapping(PidHash pidHash, string username)
    {
        designerDb.UserAccounts.Add(
            new UserAccountDbModel
            {
                PidHash = pidHash.Value,
                Username = username,
                Created = timeProvider.GetUtcNow(),
            }
        );
        await designerDb.SaveChangesAsync();
    }

    internal static string GenerateUsername(string? givenName, string? familyName)
    {
        string prefix = BuildNamePrefix(givenName, familyName);
        string suffix = Guid.NewGuid().ToString("N")[..RandomSuffixLength];
        return $"{prefix}_{suffix}";
    }

    private static string BuildNamePrefix(string? givenName, string? familyName)
    {
        string sanitizedGiven = SanitizeName(givenName);
        string sanitizedFamily = SanitizeName(familyName);

        string combined = (sanitizedGiven, sanitizedFamily) switch
        {
            ("", "") => "dev",
            ("", _) => sanitizedFamily,
            (_, "") => sanitizedGiven,
            _ => $"{sanitizedGiven}_{sanitizedFamily}",
        };

        // Reserve space for "_" separator and random suffix
        int maxPrefixLength = MaxGiteaUsernameLength - 1 - RandomSuffixLength;
        if (combined.Length > maxPrefixLength)
        {
            combined = combined[..maxPrefixLength].TrimEnd('_');
        }

        return combined;
    }

    private static string SanitizeName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "";
        }

        string sanitized = name.Trim().ToLowerInvariant().Replace("æ", "ae").Replace("ø", "o").Replace("å", "a");

        sanitized = Regex.Replace(sanitized, @"\s+", "_");
        sanitized = Regex.Replace(sanitized, "[^a-z_]", "");
        sanitized = Regex.Replace(sanitized, "_+", "_");
        sanitized = sanitized.Trim('_');

        return sanitized;
    }
}
