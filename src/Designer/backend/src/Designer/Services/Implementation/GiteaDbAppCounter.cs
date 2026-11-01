using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;
using Npgsql;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Counts the apps in Gitea's database rather than through its API, since the API only lists the repositories
/// the caller can see and Designer has no user that sees every organization's private repositories.
/// </summary>
internal sealed class GiteaDbAppCounter(GiteaDbSettings giteaDbSettings) : IGiteaAppCounter
{
    // Gitea's user type for an organization (UserTypeOrganization).
    private const int OrganizationUserType = 1;

    private const string CountQuery = """
        SELECT org.lower_name, count(*)::int
        FROM repository
        JOIN "user" org ON org.id = repository.owner_id
        WHERE org.type = @organizationType
          AND repository.lower_name <> ALL (
              SELECT org.lower_name || suffix FROM unnest(@sharedRepositorySuffixes) AS suffix
          )
        GROUP BY org.lower_name
        """;

    public async Task<IReadOnlyDictionary<string, int>> CountAppsByOrganization(CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(giteaDbSettings.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new NpgsqlCommand(CountQuery, connection);
        command.Parameters.AddWithValue("organizationType", OrganizationUserType);
        command.Parameters.AddWithValue("sharedRepositorySuffixes", RepositoryNames.SharedRepositorySuffixes.ToArray());

        var counts = new Dictionary<string, int>();
        await using NpgsqlDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            counts[reader.GetString(0)] = reader.GetInt32(1);
        }

        return counts;
    }
}
