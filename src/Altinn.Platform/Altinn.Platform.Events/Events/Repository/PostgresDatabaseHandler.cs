using Altinn.Platform.Events.Configuration;
using Npgsql;
using Npgsql.Logging;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Handling the postgres db
    /// </summary>
    public class PostgresDatabaseHandler
    {
        private readonly PostgreSQLSettings postgresSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="PostgresDatabaseHandler"/> class with the given <see cref="PostgreSQLSettings"/>.
        /// </summary>
        public PostgresDatabaseHandler(PostgreSQLSettings postgresSettings)
        {
            this.postgresSettings = postgresSettings;
        }

        /// <summary>
        /// Creates a new connection to postgres db
        /// </summary>
        public NpgsqlConnection GetConnection()
        {
            NpgsqlLogManager.Provider = new ConsoleLoggingProvider(NpgsqlLogLevel.Trace, true, true);
            return new NpgsqlConnection(postgresSettings.ConnectionString);
        }
    }
}