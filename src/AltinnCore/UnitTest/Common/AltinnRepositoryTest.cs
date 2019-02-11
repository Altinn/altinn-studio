using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Manatee.Json;
using Microsoft.Extensions.Logging;
using Moq;
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
        /// [Fact]
        public async void DownloadServicesAsync()
        {
            AltinnServiceRepository repositoryClient = new AltinnServiceRepository();

            List<AltinnResource> resources = await AltinnServiceRepository.GetResourcesAsync();

            Assert.Equal(1129, resources.Count);
        }

        /// <summary>
        ///  read and save
        /// </summary>
        /// [Fact]
        public async void ReadAllAsync()
        {
            JsonArray services = await AltinnServiceRepository.ReadAllSchemaUrls();            
            
            File.WriteAllText("altinn-xsds.json", services.ToString());

            foreach (JsonValue service in services)
            {
                JsonArray formArray = service.Object.TryGetArray("forms");

                foreach (JsonValue form in formArray)
                {
                    WebClient webClient = new WebClient();
                    string schemaUrl = form.Object.TryGetString("schemaUrl");
                    string fileName = schemaUrl.Replace("https://www.altinn.no/api/metadata/formtask", "schema");
                    fileName = fileName.Replace("/", "_");
                    fileName = fileName.Replace("_xsd", ".xsd");

                    webClient.DownloadFile(schemaUrl, fileName);
                }
            }
        }
    }
}
