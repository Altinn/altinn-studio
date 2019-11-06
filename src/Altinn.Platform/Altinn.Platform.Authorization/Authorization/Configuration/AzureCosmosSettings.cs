namespace Altinn.Platform.Authorization.Configuration
{
    /// <summary>
    /// Settings for Azure cosmos database
    /// </summary>
    public class AzureCosmosSettings
    {
        /// <summary>
        /// end point url for the cosmos database
        /// </summary>
        public string EndpointUri { get; set; }

        /// <summary>
        /// primary key used for authenticating the cosmos database
        /// </summary>
        public string PrimaryKey { get; set; }

        /// <summary>
        /// name of the database in the given end point
        /// </summary>
        public string Database { get; set; }

        /// <summary>
        /// name of the instance collection in the given database
        /// </summary>
        public string InstanceCollection { get; set; }

        /// <summary>
        /// name of the applications collection in the given database
        /// </summary>
        public string ApplicationCollection { get; set; }
    }
}
