using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.IntegrationTest.Client
{
    public class ApplicationMetadataClient
    {
        private readonly HttpClient client;

        public ApplicationMetadataClient(HttpClient client)
        {
            this.client = client;
        }
    }
}
