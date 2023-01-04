namespace Altinn.Studio.Designer.Configuration
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
        /// Password for app user for the postgres db
        /// </summary>
        public string DesignerDbPwd { get; set; }
    }
}
