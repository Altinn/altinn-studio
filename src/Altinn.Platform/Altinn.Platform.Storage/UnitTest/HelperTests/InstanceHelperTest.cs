using System.Collections.Generic;
using System.Linq;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
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
            string app1 = TestData.App_1;
            string app2 = TestData.App_2;
            string app3 = TestData.App_3;

            string expected_title_app1 = "Test applikasjon 1 bokmål";
            string expected_title_app2 = "Test applikasjon 2 bokmål";
            string expected_title_app3 = "Test applikasjon 3 bokmål";

            // Act
            List<MessageBoxInstance> actual = InstanceHelper.ConvertToMessageBoxInstanceList(TestData.InstanceList_InstanceOwner1, TestData.AppTitles_InstanceList_InstanceOwner1, language);
            string actual_title_app1 = actual.Where(i => i.AppName.Equals(app1)).Select(i => i.Title).FirstOrDefault();
            string actual_title_app2 = actual.Where(i => i.AppName.Equals(app2)).Select(i => i.Title).FirstOrDefault();
            string actual_title_app3 = actual.Where(i => i.AppName.Equals(app3)).Select(i => i.Title).FirstOrDefault();

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
            string app = TestData.App_3;
            string expected_title = "Test applikasjon 3 bokmål";

            // Act
            List<MessageBoxInstance> actual = InstanceHelper.ConvertToMessageBoxInstanceList(new List<Instance>() { TestData.Instance_3_2 }, TestData.AppTitles_Dict_App3, language);
            string actual_title = actual.Where(i => i.AppName.Equals(app)).Select(i => i.Title).FirstOrDefault();

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
            string app2 = TestData.App_2;
            string app3 = TestData.App_3;

            List<Instance> instances = new List<Instance>() { TestData.Instance_2_1, TestData.Instance_3_1 };
            Dictionary<string, Dictionary<string, string>> apptitles = new Dictionary<string, Dictionary<string, string>>()
            {
                { TestData.Application_2.Id, TestData.AppTitles_App2 },
                { TestData.Application_3.Id, TestData.AppTitles_App3 }
            };

            string expected_title_app2 = "Test applikasjon 2 bokmål";
            string expected_title_app3 = "Test applikasjon 3 nynorsk";

            // Act
            List<MessageBoxInstance> actual = InstanceHelper.ConvertToMessageBoxInstanceList(instances, TestData.AppTitles_InstanceList_InstanceOwner1, language);
            string actual_title_app2 = actual.Where(i => i.AppName.Equals(app2)).Select(i => i.Title).FirstOrDefault();
            string actual_title_app3 = actual.Where(i => i.AppName.Equals(app3)).Select(i => i.Title).FirstOrDefault();

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
            List<MessageBoxInstance> actual = InstanceHelper.ConvertToMessageBoxInstanceList(new List<Instance>() { instance }, TestData.AppTitles_Dict_App1, "nb");
            string actualId = actual.FirstOrDefault().Id;

            // Assert
            Assert.Equal(instanceGuid, actualId);     
        }

        /// <summary>
        /// Scenario: Getting sbl status for a given instance when the current task is Task_1
        /// Expected: The SBL status "FormFilling" is returned
        /// Success: SBL status is as expected
        /// </summary>
        [Fact]
        public void GetSBLStatusForCurrentTask_TC01()
        {
            Instance instance = TestData.Instance_1_Status_1;
            string sblStatus = InstanceHelper.GetSBLStatusForCurrentTask(instance);
            Assert.Equal("FormFilling", sblStatus);
        }

        /// <summary>
        /// Scenario: Getting sbl status for a given instance when the current task is null
        /// and the process.ended is not null and the status.archived is null
        /// Expected: The SBL status "Submit" is returned
        /// Success: SBL status is as expected
        /// </summary>
        [Fact]
        public void GetSBLStatusForCurrentTask_TC02()
        {
            Instance instance = TestData.Instance_1_Status_2;
            string sblStatus = InstanceHelper.GetSBLStatusForCurrentTask(instance);
            Assert.Equal("Submit", sblStatus);
        }

        /// <summary>
        /// Scenario: Getting sbl status for a given instance when the current task is null
        /// and the process.ended is not null and the status.archived is not null
        /// Expected: The SBL status "Archived" is returned
        /// Success: SBL status is as expected
        /// </summary>
        [Fact]
        public void GetSBLStatusForCurrentTask_TC03()
        {
            Instance instance = TestData.Instance_1_Status_3;
            string sblStatus = InstanceHelper.GetSBLStatusForCurrentTask(instance);
            Assert.Equal("Archived", sblStatus);
        }

        /// <summary>
        /// Scenario: Getting sbl status for a given instance when the process is null
        /// and the process.ended is null and the status.archived is null
        /// Expected: The SBL status "default" is returned
        /// Success: SBL status is as expected
        /// </summary>
        [Fact]
        public void GetSBLStatusForCurrentTask_TC04()
        {
            Instance instance = TestData.Instance_1_Status_4;
            string sblStatus = InstanceHelper.GetSBLStatusForCurrentTask(instance);
            Assert.Equal("default", sblStatus);
        }
    }
}
