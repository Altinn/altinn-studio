using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using System.Xml.Schema;
using AltinnCore.Common.Factories.ModelFactory;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Moq;
using Xunit;

namespace AltinnCore.UnitTest.Common
{
    /// <summary>
    /// Tests converting Json Schema to XSD
    /// </summary>
    [Obsolete]
    public class SeresXsdParserTest
    {
        /// <summary>
        ///  convert a recursive json schema
        /// </summary>
        [Fact]
        public void ConvertRecursiveSchemaJsonMetadata()
        {
            Mock<IRepository> moqRepository = new Mock<IRepository>();
            var seresParser = new SeresXsdParser(moqRepository.Object);
            XDocument mainXsd = XDocument.Load("Common/xsd/schema-w-recursion.xsd");

            ServiceMetadata serviceMetadata = seresParser.ParseXsdToServiceMetadata("123", "app", mainXsd, null);

            string metadataAsJson = Newtonsoft.Json.JsonConvert.SerializeObject(serviceMetadata);

            File.WriteAllText("metadata-recursive.json", metadataAsJson);

            JsonMetadataParser metadataParser = new JsonMetadataParser();
            string classMeta = metadataParser.CreateModelFromMetadata(serviceMetadata);

            File.WriteAllText("classdata-recursive.cs", classMeta);
        }

        /// <summary>
        ///   convert edagschema to json metadata and c#
        /// </summary>
        [Fact]
        public void ConvertExistingEdagSchemaToJsonMetadataAndCsharp()
        {
            Mock<IRepository> moqRepository = new Mock<IRepository>(); 
            var seresParser = new SeresXsdParser(moqRepository.Object);
            XDocument mainXsd = XDocument.Load("Common/xsd/schema.xsd");

            ServiceMetadata serviceMetadata = seresParser.ParseXsdToServiceMetadata("123", "app", mainXsd, null);

            string metadataAsJson = Newtonsoft.Json.JsonConvert.SerializeObject(serviceMetadata);

            File.WriteAllText("edag.original.metadata.json", metadataAsJson);

            JsonMetadataParser metadataParser = new JsonMetadataParser();
            string classMeta = metadataParser.CreateModelFromMetadata(serviceMetadata);

            File.WriteAllText("edag.original.csharp.cs", classMeta);
        }

        /// <summary>
        ///  convert a Skatteetaten schema
        /// </summary>
        [Fact]
        public void ConvertSkatteetatenBSU()
        {
            Mock<IRepository> moqRepository = new Mock<IRepository>();
            var seresParser = new SeresXsdParser(moqRepository.Object);
            XDocument mainXsd = XDocument.Load("Common/xsd/boligsparingForUngdom_v1_1.xsd");

            ServiceMetadata serviceMetadata = seresParser.ParseXsdToServiceMetadata("123", "app", mainXsd, null);

            string metadataAsJson = Newtonsoft.Json.JsonConvert.SerializeObject(serviceMetadata);

            File.WriteAllText("boligsparingForUngdom.json", metadataAsJson);

            JsonMetadataParser metadataParser = new JsonMetadataParser();
            string classMeta = metadataParser.CreateModelFromMetadata(serviceMetadata);

            File.WriteAllText("boligsparingForUngdom.cs", classMeta);
        }

        /// <summary>
        ///  convert a Skatteetaten schema
        /// </summary>
        [Fact]
        public void ConvertServiceModel()
        {
            Dictionary<string, Dictionary<string, string>> textDictionary = new Dictionary<string, Dictionary<string, string>>();

            Mock<IRepository> moqRepository = new Mock<IRepository>();
            moqRepository
                .Setup(r => r.GetServiceTexts(It.IsAny<string>(), It.IsAny<string>())).Returns(textDictionary);

            var seresParser = new SeresXsdParser(moqRepository.Object);
            XDocument mainXsd = XDocument.Load("Common/xsd/ServiceModel.xsd");

            ServiceMetadata serviceMetadata = seresParser.ParseXsdToServiceMetadata("123", "app", mainXsd, null);

            string metadataAsJson = Newtonsoft.Json.JsonConvert.SerializeObject(serviceMetadata);

            File.WriteAllText("service-model.json", metadataAsJson);

            JsonMetadataParser metadataParser = new JsonMetadataParser();
            string classMeta = metadataParser.CreateModelFromMetadata(serviceMetadata);

            File.WriteAllText("service-model.cs", classMeta);

            File.WriteAllText("servcie-model-texts.txt", Newtonsoft.Json.JsonConvert.SerializeObject(textDictionary));
        }

        /// <summary>
        ///  convert a Skatteetaten schema
        /// </summary>
        [Fact]
        public void ConvertNæringsoppgave()
        {
            string xsdFileName = "Common/xsd/melding-2-12186.xsd";
            string outName = "melding-2-12186-output";

            Dictionary<string, Dictionary<string, string>> textDictionary = new Dictionary<string, Dictionary<string, string>>();

            Mock<IRepository> moqRepository = new Mock<IRepository>();
            moqRepository
                .Setup(r => r.GetServiceTexts(It.IsAny<string>(), It.IsAny<string>())).Returns(textDictionary);

            XmlReaderSettings settings = new XmlReaderSettings();
            settings.IgnoreWhitespace = true;

            var doc = XmlReader.Create(xsdFileName, settings);
            XDocument mainXsd = XDocument.Load(doc);

            var seresParser = new SeresXsdParser(moqRepository.Object);
            ServiceMetadata serviceMetadata = seresParser.ParseXsdToServiceMetadata("123", "app", mainXsd, null);

            string metadataAsJson = Newtonsoft.Json.JsonConvert.SerializeObject(serviceMetadata);

            File.WriteAllText(outName + ".json", metadataAsJson);

            JsonMetadataParser metadataParser = new JsonMetadataParser();
            string classMeta = metadataParser.CreateModelFromMetadata(serviceMetadata);

            File.WriteAllText(outName + ".cs", classMeta);

            File.WriteAllText(outName + "-texts.json", Newtonsoft.Json.JsonConvert.SerializeObject(textDictionary));
        }

        /// <summary>
        ///  convert a Skatteetaten schema
        /// </summary>
        [Fact]
        public void ConvertSkatteetatenMotorvognavgift()
        {
            Mock<IRepository> moqRepository = new Mock<IRepository>();
            var seresParser = new SeresXsdParser(moqRepository.Object);
            XDocument mainXsd = XDocument.Load("Common/xsd/motorvognavgift-v4.xsd");

            ServiceMetadata serviceMetadata = seresParser.ParseXsdToServiceMetadata("123", "app", mainXsd, null);

            string metadataAsJson = Newtonsoft.Json.JsonConvert.SerializeObject(serviceMetadata);

            File.WriteAllText("motorvognavgift.json", metadataAsJson);

            JsonMetadataParser metadataParser = new JsonMetadataParser();
            string classMeta = metadataParser.CreateModelFromMetadata(serviceMetadata);

            File.WriteAllText("motorvognavgift.cs", classMeta);
        }

        /// <summary>
        ///  convert a Skatteetaten schema
        /// </summary>
        [Fact]
        public void ConvertSkatteetatenSkattemelding()
        {
            Mock<IRepository> moqRepository = new Mock<IRepository>();
            var seresParser = new SeresXsdParser(moqRepository.Object);
            XDocument mainXsd = XDocument.Load("Common/xsd/Skattemelding_v6.25.xsd");

            ServiceMetadata serviceMetadata = seresParser.ParseXsdToServiceMetadata("123", "app", mainXsd, null);

            string metadataAsJson = Newtonsoft.Json.JsonConvert.SerializeObject(serviceMetadata);

            File.WriteAllText("skattemelding.json", metadataAsJson);

            JsonMetadataParser metadataParser = new JsonMetadataParser();
            string classMeta = metadataParser.CreateModelFromMetadata(serviceMetadata);

            File.WriteAllText("skattemelding.cs", classMeta);
        }
    }
}
