using System;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.StudioOidc;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Altinn.Studio.Designer.Services.Implementation;

public sealed class MockportenAccountService(
    DesignerdbContext designerDb,
    GiteaDbSettings giteaDbSettings,
    MockportenSettings settings,
    IUserProvisioningService provisioning,
    TimeProvider timeProvider
)
{
    public async Task<string> ResolveAsync(string pidHash)
    {
        var configured = settings.Enabled ? settings.Users.SingleOrDefault(user => user.PidHash == pidHash) : null;
        if (configured is null)
        {
            throw new UnauthorizedAccessException("This test identity is not configured for Studio.");
        }

        var account = await designerDb.UserAccounts.SingleOrDefaultAsync(user => user.PidHash == pidHash);
        if (account is not null)
        {
            if (
                account.AuthenticationProvider != StudioAuthenticationProviders.Mockporten
                || account.Username != configured.Username
                || account.Deactivated
            )
            {
                throw new UnauthorizedAccessException("The test account is unavailable.");
            }
        }
        else
        {
            // Never attach a synthetic identity to a pre-existing Designer or Gitea account.
            if (
                await designerDb.UserAccounts.AnyAsync(user => user.Username == configured.Username)
                || await GiteaUserExistsAsync(configured.Username)
            )
            {
                throw new UnauthorizedAccessException("The configured test username is already in use.");
            }

            account = new UserAccountDbModel
            {
                Username = configured.Username,
                PidHash = pidHash,
                AuthenticationProvider = StudioAuthenticationProviders.Mockporten,
                Created = timeProvider.GetUtcNow(),
            };
            designerDb.UserAccounts.Add(account);
            await designerDb.SaveChangesAsync();
        }

        await provisioning.EnsureUserExistsAsync(account.Username, "Studio test account");
        return account.Username;
    }

    private async Task<bool> GiteaUserExistsAsync(string username)
    {
        await using var connection = new NpgsqlConnection(giteaDbSettings.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "SELECT EXISTS (SELECT 1 FROM \"user\" WHERE lower_name = @username)",
            connection
        );
        command.Parameters.AddWithValue("username", username);
        return (bool)(await command.ExecuteScalarAsync())!;
    }
}
