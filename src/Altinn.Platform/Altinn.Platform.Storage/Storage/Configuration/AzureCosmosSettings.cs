using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Configuration
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
        /// name of the collection in the given database
        /// </summary>
        public string Collection { get; set; }
    }
}
