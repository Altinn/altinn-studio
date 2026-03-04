using System;
using System.Security.Cryptography;
using System.Text;
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
    DeveloperMappingSettings mappingSettings
) : IStudioOidcUsernameProvider
{
    private const string GiteaLookupQuery = """
        SELECT u.lower_name
        FROM external_login_user elu
        JOIN "user" u ON elu.user_id = u.id
        WHERE elu.external_id = @sub
        LIMIT 1
        """;

    public async Task<string> ResolveUsernameAsync(string sub, string pid)
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
        string generatedUsername = await GenerateUniqueUsername();
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
                Created = DateTimeOffset.UtcNow,
            }
        );
        await designerDb.SaveChangesAsync();
    }

    private async Task<string> GenerateUniqueUsername()
    {
        const int MaxAttempts = 10;
        for (int i = 0; i < MaxAttempts; i++)
        {
            string candidate = $"{mappingSettings.UsernamePrefix}-{GenerateRandomString(8)}";
            bool exists = await designerDb.UserAccounts.AnyAsync(m => m.Username == candidate);

            if (!exists)
            {
                return candidate;
            }
        }

        throw new InvalidOperationException("Failed to generate a unique username after multiple attempts.");
    }

    private string ComputePidHash(string pid)
    {
        byte[] bytes = SHA256.HashData(Encoding.UTF8.GetBytes(mappingSettings.PidHashSalt + pid));
        return Convert.ToHexStringLower(bytes);
    }

    private static string GenerateRandomString(int length)
    {
        const string Chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        return RandomNumberGenerator.GetString(Chars, length);
    }
}
