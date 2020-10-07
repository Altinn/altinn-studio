using Altinn.Platform.Events.Configuration;
using Npgsql;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Something smart
    /// </summary>
    public class PostgresDatabaseHandler
    {
        private readonly PostgresSettings postgresSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="PostgresDatabaseHandler"/> class with the given <see cref="PostgresSettings"/>.
        /// </summary>
        public PostgresDatabaseHandler(PostgresSettings postgresSettings)
        {
            this.postgresSettings = postgresSettings;
        }

        /// <summary>
        /// Something smart
        /// </summary>
        public NpgsqlConnection GetConnection()
        {
            return new NpgsqlConnection(postgresSettings.DefaultConnection);
        }
    }
}