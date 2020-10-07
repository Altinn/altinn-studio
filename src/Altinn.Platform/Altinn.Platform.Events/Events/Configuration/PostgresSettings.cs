namespace Altinn.Platform.Events.Configuration
{
    /// <summary>
    /// Settings for Postgres database
    /// </summary>
    public class PostgresSettings
    {
        /// <summary>
        /// Connection string for the postgres db
        /// </summary>
        public string DefaultConnection { get; set; }
    }
}