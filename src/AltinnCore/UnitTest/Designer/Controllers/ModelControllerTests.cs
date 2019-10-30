using System.Collections.Generic;
using System.IO;
using System.Xml.Linq;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Controllers;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NUnit.Framework;
using Xunit;

namespace AltinnCore.UnitTest.Designer.Controllers
{
    /// <summary>
    ///  tests
    /// </summary>
    public class ModelControllerTests
    {
        /// <summary>
        ///  x
        /// </summary>
        [Fact]
        public void CanUploadIso8859EncodedXmlFiles()
        {
            // Arrange
            ServiceMetadata serviceMetadata = null;
            XDocument xmlDocument = null;

            Mock<IRepository> moqRepository = new Mock<IRepository>();
            moqRepository.Setup(r => r.CreateModel(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<ServiceMetadata>(), It.IsAny<XDocument>()))
                .Returns(true)
                .Callback<string, string, ServiceMetadata, XDocument>((o, s, m, d) =>
                {
                    serviceMetadata = m;
                    xmlDocument = d;
                });

            ModelController controller = new ModelController(moqRepository.Object, new TestLoggerFactory());

            IFormFile formFile = AsMockIFormFile("Designer/Controllers/Edag-latin1.xsd");

            ActionResult result = controller.Upload("Org", "app2", formFile);

            Assert.NotNull(serviceMetadata);

            Assert.True(serviceMetadata.Elements.ContainsKey("melding.LeveranseæøåÆØÅ"));
        }

        /// <summary>
        ///  2x
        /// </summary>
        [Fact]
        public void CanUploadTextsThatIgnoresWithespace()
        {
            // Arrange
            Dictionary<string, Dictionary<string, string>> dictionary = null;

            Dictionary<string, Dictionary<string, string>> existingDictionary = new Dictionary<string, Dictionary<string, string>>();
            ServiceMetadata serviceMetadata = null;

            Mock<IRepository> moqRepository = new Mock<IRepository>();
            moqRepository.Setup(r => r.SaveServiceTexts(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, Dictionary<string, string>>>()))        
                .Callback<string, string, Dictionary<string, Dictionary<string, string>>>((o, s, d) =>
                {
                    dictionary = d;
                });
            moqRepository.Setup(r => r.GetServiceTexts(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(existingDictionary);

            moqRepository.Setup(r => r.CreateModel(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<ServiceMetadata>(), It.IsAny<XDocument>()))
                .Returns(true)
                .Callback<string, string, ServiceMetadata, XDocument>((o, s, m, d) =>
                {
                    serviceMetadata = m;
                });

            ModelController controller = new ModelController(moqRepository.Object, new TestLoggerFactory());

            IFormFile formFile = AsMockIFormFile("Common/xsd/ServiceModel.xsd");

            ActionResult result = controller.Upload("Org", "app2", formFile);

            Assert.True(serviceMetadata.Elements.ContainsKey("Skjema.Skattyterinforgrp5801.Kontaktgrp5803.KontaktpersonPostnummerdatadef10441.value"));

            Assert.NotNull(dictionary);        

            string lookupValue = dictionary.GetValueOrDefault("10441.KontaktpersonPostnummerdatadef10441.Label").GetValueOrDefault("nb-NO");

            // Text should be without extra withespaces
            Assert.Equal("Postnummer", lookupValue);           
        }

        private IFormFile AsMockIFormFile(string file)
        {
            var physicalFile = new FileInfo(file);
            var fileMock = new Mock<IFormFile>();
            var ms = new MemoryStream();

            using (FileStream fs = File.OpenRead(file))
            {
                fs.CopyTo(ms);
            }

            ms.Position = 0;
            var fileName = physicalFile.Name;

            // Setup mock file using info from physical file
            fileMock.Setup(_ => _.FileName).Returns(fileName);
            fileMock.Setup(_ => _.Length).Returns(ms.Length);
            fileMock.Setup(m => m.OpenReadStream()).Returns(ms);
            fileMock.Setup(m => m.ContentDisposition).Returns(string.Format("inline; filename={0}", fileName));

            return fileMock.Object;           
        }
    }
}
