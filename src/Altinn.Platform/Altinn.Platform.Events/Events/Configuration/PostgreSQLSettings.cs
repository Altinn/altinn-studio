namespace Altinn.Platform.Events.Configuration
{
    /// <summary>
    /// Settings for Postgres database
    /// </summary>
    public class PostgreSQLSettings
    {
        /// <summary>
        /// Connection string for the postgres db
        /// </summary>
        public string ConnectionString { get; set; }

        /// <summary>
        /// Password for postgres db
        /// </summary>
        public string EventsDbPwd { get; set; }
    }
}