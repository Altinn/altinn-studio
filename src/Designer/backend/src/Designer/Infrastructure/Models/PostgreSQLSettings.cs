#nullable disable
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Settings for Postgres database
    /// </summary>
    public class PostgreSQLSettings : ISettingsMarker
    {
        /// <summary>
        /// Connection string for the postgres db
        /// </summary>
        public string ConnectionString { get; set; }

        /// <summary>
        /// Password for app user for the postgres db
        /// </summary>
        public string DesignerDbPwd { get; set; }

        public string FormattedConnectionString()
        {
            return string.Format(ConnectionString, DesignerDbPwd);
        }
    }
}
