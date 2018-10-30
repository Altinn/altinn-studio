using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AltinnCore.Runtime.Db.Configuration
{
    public class AzureCosmosSettings
    {
        public string EndpointUri { get; set; }
        public string PrimaryKey { get; set; }
        public string Database { get; set; }
        public string Collection { get; set; }
    }
}
