using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using Altinn.App.Api.Mappers;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;

using Xunit;

namespace App.IntegrationTestsRef.Mappers
{
    /// <summary>
    /// Test clas for SimpleInstanceMapper
    /// </summary>
    public class SimpleInstanceMapperTest
    {
        [Fact]
        public void MapInstanceListToSimpleInstanceList_NameMissingFromDict_LastChangedByEmptyString()
        {
            // Arrange
            DateTime lastChanged = DateTime.Now;

            Instance i = new Instance
            {
                Id = "1337/447ed22d-67a8-42c7-8add-cc35eba304f1",
                LastChanged = lastChanged,
                LastChangedBy = "160694"
            };

            List<SimpleInstance> actualList = SimpleInstanceMapper.MapInstanceListToSimpleInstanceList(
                new List<Instance> { i },
                new Dictionary<string, string>());

            SimpleInstance actual = actualList.First();

            Assert.Single(actualList);
            Assert.Equal(lastChanged, actual.LastChanged);
            Assert.Equal(string.Empty, actual.LastChangedBy);
        }

        [Fact]
        public void MapInstanceToSimpleInstance_AllPropsMappedOk()
        {
            // Arrange
            DateTime lastChanged = DateTime.Now;
            string expectedLastChangedBy = "Kylie Jenner";
            string expectedInstanceId = "1337/447ed22d-67a8-42c7-8add-cc35eba304f1";

            Instance i = new Instance
            {
                Id = "1337/447ed22d-67a8-42c7-8add-cc35eba304f1",
                LastChanged = lastChanged,
                LastChangedBy = "160694"
            };

            // Act
            SimpleInstance actual = SimpleInstanceMapper.MapInstanceToSimpleInstance(i, "Kylie Jenner");

            Assert.Equal(lastChanged, actual.LastChanged);
            Assert.Equal(expectedLastChangedBy, actual.LastChangedBy);
            Assert.Equal(expectedInstanceId, actual.InstanceId);
        }

        [Fact]
        public void MapInstanceListToSimpleInstanceList_MultipleInstancesMappedOK()
        {
            // Arrange
            DateTime lastChanged = DateTime.Now;

            Instance i1 = new Instance
            {
                Id = "1337/447ed22d-67a8-42c7-8add-cc35eba304f1",
                LastChanged = lastChanged,
                LastChangedBy = "160694"
            };

            Instance i2 = new Instance
            {
                Id = "1337/447ed22d-67a8-42c7-8add-cc35eba304g3",
                LastChanged = lastChanged,
                LastChangedBy = "987654321"
            };

            Dictionary<string, string> orgUserLookup = new Dictionary<string, string>()
            {
                { "160694", "Kylie Jenner" },
                { "987654321", "Kylie Baby Skin Care AS" }
            };

            // Act
            List<SimpleInstance> actualList = SimpleInstanceMapper.MapInstanceListToSimpleInstanceList(
                new List<Instance> { i1, i2 },
                orgUserLookup);

            SimpleInstance actual1 = actualList.First(si => si.InstanceId.Equals("1337/447ed22d-67a8-42c7-8add-cc35eba304f1"));
            SimpleInstance actual2 = actualList.First(si => si.InstanceId.Equals("1337/447ed22d-67a8-42c7-8add-cc35eba304g3"));

            // Assert
            string expectedLastChangedBy1 = "Kylie Jenner";
            string expectedLastChangedBy2 = "Kylie Baby Skin Care AS";

            Assert.Equal(2, actualList.Count);
            Assert.Equal(expectedLastChangedBy1, actual1.LastChangedBy);
            Assert.Equal(expectedLastChangedBy2, actual2.LastChangedBy);

        }
    }
}
