using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Npgsql;

namespace Altinn.Studio.Designer.Services.Implementation;

public class GiteaDbStudioOidcUsernameProvider(GiteaDbSettings giteaDbSettings) : IStudioOidcUsernameProvider
{
    private const string LookupQuery =
        """
        SELECT u.lower_name
        FROM external_login_user elu
        JOIN "user" u ON elu.user_id = u.id
        WHERE elu.external_id = @sub
        LIMIT 1
        """;

    public async Task<string> ResolveUsernameAsync(string sub, string pid)
    {
        await using var connection = new NpgsqlConnection(giteaDbSettings.ConnectionString);
        await connection.OpenAsync();

        await using var command = new NpgsqlCommand(LookupQuery, connection);
        command.Parameters.AddWithValue("sub", sub);

        object? result = await command.ExecuteScalarAsync();

        return result is string username ? username : $"pid-{pid}";
    }
}
