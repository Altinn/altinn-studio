using System.Collections.Generic;
using System.Linq;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Models;
using Storage.Interface.Models;
using Xunit;

namespace Altinn.Platform.Storage.UnitTest
{

    /// <summary>
    /// This is a test class for InstanceHelper and is intended
    /// to contain all InstanceHelper Unit Tests
    /// </summary>
    public class InstanceHelperTest
    {

        public InstanceHelperTest()
        {

        }

        /// <summary>
        /// Scenario: Converting list of four instances to messagebox instances with "nb" as language preference. 
        /// Expected: Application titles are all available in "nb"
        /// Success: All instances are converted and the titles are listed in "nb"
        /// </summary>
        [Fact]
        public void ConvertToMessageBoxInstance_TC01()
        {
            // Arrange
            string language = "nb";
            string appName1 = TestData.AppName_1;
            string appName2 = TestData.AppName_2;
            string appName3 = TestData.AppName_3;

            string expected_title_app1 = "Test applikasjon 1 bokmål";
            string expected_title_app2 = "Test applikasjon 2 bokmål";
            string expected_title_app3 = "Test applikasjon 3 bokmål";

            // Act
            List<MessageBoxInstance> actual = InstanceHelper.ConvertToMessageBoxInstance(TestData.InstanceList_InstanceOwner1, TestData.AppTitles_InstanceList_InstanceOwner1, language);
            string actual_title_app1 = actual.Where(i => i.AppName.Equals(appName1)).Select(i => i.Title).FirstOrDefault();
            string actual_title_app2 = actual.Where(i => i.AppName.Equals(appName2)).Select(i => i.Title).FirstOrDefault();
            string actual_title_app3 = actual.Where(i => i.AppName.Equals(appName3)).Select(i => i.Title).FirstOrDefault();

            // Assert
            Assert.Equal(expected_title_app1, actual_title_app1);
            Assert.Equal(expected_title_app2, actual_title_app2);
            Assert.Equal(expected_title_app3, actual_title_app3);

        }

        /// <summary> 
        /// Scenario: Converting list containing a single instance with "en" as language preference
        /// Expected: Application title is only available in "nn-NO" and "nb"
        /// Success:  Instance is converted but title is set to "nb"
        /// </summary>
        [Fact]
        public void ConvertToMessageBoxInstance_TC02()
        {
            // Arrange
            string language = "en";
            string appName = TestData.AppName_3;
            string expected_title = "Test applikasjon 3 bokmål";

            // Act
            List<MessageBoxInstance> actual = InstanceHelper.ConvertToMessageBoxInstance(new List<Instance>() { TestData.Instance_3_2 }, TestData.AppTitles_Dict_App3, language);
            string actual_title = actual.Where(i => i.AppName.Equals(appName)).Select(i => i.Title).FirstOrDefault();

            // Assert
            Assert.Equal(expected_title, actual_title);
        }


        /// <summary>
        /// Scenario: Converting list containing two instances with "nn-NO" as language preference
        /// Expected: Application title is available in "nn-NO" for only one of the instances
        /// Success: Default language "nb" is returned for 
        /// </summary>
        [Fact]
        public void ConvertToMessageBoxInstance_TC03()
        {
            // Arrange
            string language = "nn-NO";
            string appName2 = TestData.AppName_2;
            string appName3 = TestData.AppName_3;

            List<Instance> instances = new List<Instance>() { TestData.Instance_2_1, TestData.Instance_3_1 };
            Dictionary<string, Dictionary<string, string>> apptitles = new Dictionary<string, Dictionary<string, string>>()
            {
                { TestData.App_2.Id, TestData.AppTitles_App2 },
                { TestData.App_3.Id, TestData.AppTitles_App3 }
            };

            string expected_title_app2 = "Test applikasjon 2 bokmål";
            string expected_title_app3 = "Test applikasjon 3 nynorsk";

            // Act
            List<MessageBoxInstance> actual = InstanceHelper.ConvertToMessageBoxInstance(instances, TestData.AppTitles_InstanceList_InstanceOwner1, language);
            string actual_title_app2 = actual.Where(i => i.AppName.Equals(appName2)).Select(i => i.Title).FirstOrDefault();
            string actual_title_app3 = actual.Where(i => i.AppName.Equals(appName3)).Select(i => i.Title).FirstOrDefault();

            // Assert
            Assert.Equal(expected_title_app2, actual_title_app2);
            Assert.Equal(expected_title_app3, actual_title_app3);
        }


        /// <summary>
        /// Scenario: Converting list containing a single instance whith id {instanceOwner}/{instanceGuid}
        /// Expected: The instance is converted to a message box instance
        /// Success: MessageBoxInstance Id equals {instanceGuid}
        /// </summary>
        [Fact]
        public void ConvertToMessageBoxInstance_TC04()
        {
            // Arrange
            string instanceOwner = "instanceOwner";
            string instanceGuid = "instanceGuid";
            Instance instance = TestData.Instance_1_1;
            instance.Id = $"{instanceOwner}/{instanceGuid}";        
        
            // Act
            List<MessageBoxInstance> actual = InstanceHelper.ConvertToMessageBoxInstance(new List<Instance>() { instance }, TestData.AppTitles_Dict_App1, "nb");
            string actualId = actual.FirstOrDefault().Id;

            // Assert
            Assert.Equal(instanceGuid, actualId);     
        }
    }
}
