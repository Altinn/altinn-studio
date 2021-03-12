using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Xml.Serialization;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Xunit;

namespace Altinn.EFormidlingClient.Tests.UnitTest
{
    /// <summary>
    /// Represents a collection of unit test, testing the<see cref="EFormidlingClientUnitTest"/> class.
    /// </summary>
    public class EFormidlingClientUnitTest
    {
        /// <summary>
        /// Test valid sbd json 
        /// </summary>
        [Fact]
        public void Is_Valid_Json()
        {
            var jsonString = File.ReadAllText(@"TestData\sbd.json");
            var json = JsonSerializer.Deserialize<StandardBusinessDocument>(jsonString);

            Assert.NotNull(json);
        }

        /// <summary>
        /// Test invalid sbd json
        /// </summary>
        [Fact]
        public void Is_Not_Valid_Json()
        {
            var jsonString = File.ReadAllText(@"TestData\sbdInvalid.json");
            var json = JsonSerializer.Deserialize<StandardBusinessDocument>(jsonString);

            Assert.NotNull(json);
        }

        /// <summary>
        /// Test valid xml arkivmelding
        /// </summary>
        [Fact]
        public void Is_Valid_Xml()
        {
            using (FileStream fs = File.OpenRead(@"TestData\arkivmelding.xml"))
            {
                XmlSerializer serializer = new XmlSerializer(typeof(Models.Arkivmelding2.Arkivmelding));
                Models.Arkivmelding2.Arkivmelding ark = (Models.Arkivmelding2.Arkivmelding)serializer.Deserialize(fs);

                Assert.NotNull(ark);
            }
        }

        /// <summary>
        /// Tests
        /// </summary>
        [Fact]
        public void Read_XML_Test_Data()
        {
            using (FileStream fs = File.OpenRead(@"TestData\arkivmelding.xml"))
            {
                Assert.True(fs.Length > 0);
            }
        }
    }
}
