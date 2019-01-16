using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Xml;
using AltinnCore.Common.Factories.ModelFactory;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Xunit;

namespace AltinnCore.UnitTest.Common
{
    /// <summary>
    ///  xxxx
    /// </summary>
    public class AltinnRepositoryTest
    {
        /// <summary>
        ///  jkjlkjkljlkj
        /// </summary>
        [Fact]
        public async void DownloadServicesAsync()
        {
            AltinnServiceRepository repositoryClient = new AltinnServiceRepository();

            List<AltinnResource> resources = await AltinnServiceRepository.GetResourcesAsync();

            Assert.Equal(1127, resources.Count);
        }

        /// <summary>
        ///  read and save
        /// </summary>
        [Fact]
        public async void ReadAllAsync()
        {
            List<string> schemaUrls = await AltinnServiceRepository.ReadAllSchemaUrls();

            var json = JsonConvert.SerializeObject(schemaUrls);

            File.WriteAllText("altinn-xsds.json", json);

            foreach (string schemaUrl in schemaUrls)
            {
                var webClient = new WebClient();
                string fileName = schemaUrl.Replace("https://www.altinn.no/api/metadata/formtask", "schema");
                fileName = fileName.Replace("/", "_");
                fileName = fileName.Replace("_xsd", ".xsd");
                
                webClient.DownloadFile(schemaUrl, fileName);
            }
        }
    }
}
