using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Altinn.Studio.Designer.Services.Implementation;

public class GiteaDbStudioOidcUsernameProvider(
    DesignerdbContext designerDb,
    GiteaDbSettings giteaDbSettings,
    DeveloperMappingSettings mappingSettings,
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

    public async Task<string> ResolveUsernameAsync(string sub, string pid, string? givenName)
    {
        string pidHash = ComputePidHash(pid);

        // Step 1: Check Designer DB mapping
        var mapping = await designerDb.UserAccounts.FirstOrDefaultAsync(m => m.PidHash == pidHash);

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
        string generatedUsername = GenerateUsername(givenName);
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

    private async Task StoreMapping(string pidHash, string username)
    {
        designerDb.UserAccounts.Add(
            new UserAccountDbModel
            {
                PidHash = pidHash,
                Username = username,
                Created = timeProvider.GetUtcNow(),
            }
        );
        await designerDb.SaveChangesAsync();
    }

    private static string GenerateUsername(string? givenName)
    {
        string prefix = SanitizeNamePrefix(givenName);
        string suffix = Guid.NewGuid().ToString("N")[..8];
        return $"{prefix}_{suffix}";
    }

    private static string SanitizeNamePrefix(string? givenName)
    {
        if (string.IsNullOrWhiteSpace(givenName))
        {
            return "dev";
        }

        string sanitized = givenName
            .ToLowerInvariant()
            .Replace("æ", "ae")
            .Replace("ø", "o")
            .Replace("å", "a");

        sanitized = Regex.Replace(sanitized, "[^a-z]", "");

        return sanitized.Length > 0 ? sanitized : "dev";
    }

    private string ComputePidHash(string pid)
    {
        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(mappingSettings.PidHashSalt + pid));
        return Convert.ToHexStringLower(bytes);
    }
}
