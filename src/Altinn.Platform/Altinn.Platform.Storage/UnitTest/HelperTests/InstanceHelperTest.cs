using System;
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
        /// Scenario: Converting list containing a single instance whith id {instanceOwner}/{instanceGuid}
        /// Expected: The instance is converted to a message box instance
        /// Success: MessageBoxInstance Id equals {instanceGuid}
        /// </summary>
        [Fact]
        public void ConvertToMessageBoxInstance_TC01()
        {
            // Arrange
            string instanceOwner = "instanceOwner";
            string instanceGuid = "instanceGuid";
            Instance instance = TestData.Instance_1_1;
            instance.Id = $"{instanceOwner}/{instanceGuid}";

            // Act
            MessageBoxInstance actual = InstanceHelper.ConvertToMessageBoxInstance(instance);

            // Assert
            Assert.Equal(instanceGuid, actual.Id);
        }

        /// <summary>
        /// Scenario: Convert instance
        /// Expected: The LastChangedBy in MessageBoxInstance comes from the instance itself
        /// Success: MessageBoxInstance LastChangedBy equals {lastChangedBy}
        /// </summary>
        [Fact]
        public void ConvertToMessageBoxInstance_TC02()
        {
            // Arrange
            string lastChangedBy = "20000000";
            Instance instance = TestData.Instance_1_1;         

            // Act
            MessageBoxInstance actual = InstanceHelper.ConvertToMessageBoxInstance( instance );

            // Assert
            Assert.Equal(lastChangedBy, actual.LastChangedBy);
        }

        /// <summary>
        /// Scenario: Converting list containing a single instance with data element, where LastChanged for data element is older than LastChanged for instance.
        /// Expected: The LastChangedBy in MessageBoxInstance comes from data element
        /// Success: MessageBoxInstance LastChangedBy equals {lastChangedBy}
        /// </summary>
        [Fact]
        public void ConvertToMessageBoxSingleInstance_TC03()
        {
            // Arrange
            string lastChangedBy = TestData.UserId_1;
            Instance instance = TestData.Instance_1_1;
            instance.Data = new List<DataElement>() {
                new DataElement()
                {
                    LastChanged = Convert.ToDateTime("2019-08-21T19:19:22.2135489Z"),
                    LastChangedBy = lastChangedBy
                }
            };

            // Act
            MessageBoxInstance actual = InstanceHelper.ConvertToMessageBoxInstance(instance);
            string actualLastChangedBy = actual.LastChangedBy;

            // Assert
            Assert.Equal(lastChangedBy, actualLastChangedBy);            
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

        /// <summary>
        /// Scenario: Find last changed by from the instance and date elements
        /// Expected: lastChangedBy is an user id is from the instance without dateelements
        /// Success: lastChangedBy equals {expectedlastChangedBy} and lastchanged equals {expectedlastChanged}
        /// </summary>
        [Fact]
        public void FindLastChangedBy_TC01()
        {
            // Arrange
            Instance instance = TestData.Instance_2_2;
            string expectedlastChangedBy = "20000000";
            DateTime expectedlastChanged = Convert.ToDateTime("2019-08-20T19:19:22.2135489Z");

            // Act
            (string lastChangedBy, DateTime? lastChanged) = InstanceHelper.FindLastChanged(instance);

            // Assert
            Assert.Equal(expectedlastChangedBy, lastChangedBy);
            Assert.Equal(expectedlastChanged, lastChanged);
        }

        /// <summary>
        /// Scenario: Find last changed by from the instance and date elements
        /// Expected: lastChangedBy is an user id from one dataelement
        /// Success: lastChangedBy equals {expectedlastChangedBy} and lastchanged equals {expectedlastChanged}
        /// </summary>
        [Fact]
        public void FindLastChangedBy_TC02()
        {
            // Arrange
            Instance instance = TestData.Instance_1_2;
            string expectedlastChangedBy = "20000001";
            DateTime expectedlastChanged = Convert.ToDateTime("2019-09-20T21:19:22.2135489Z");

            // Act
            (string lastChangedBy, DateTime? lastChanged) = InstanceHelper.FindLastChanged(instance);

            // Assert
            Assert.Equal(expectedlastChangedBy, lastChangedBy);
            Assert.Equal(expectedlastChanged, lastChanged);
        }

        /// <summary>
        /// Scenario: Find last changed by from the instance and date elements
        /// Expected: lastChangedBy is an user id from the dataelements list that has the latest lastChanged datetime
        /// Success: lastChangedBy equals {expectedlastChangedBy} and lastchanged equals {expectedlastChanged}
        /// </summary>
        [Fact]
        public void FindLastChangedBy_TC03()
        {
            // Arrange
            Instance instance = TestData.Instance_2_1;
            string expectedlastChangedBy = "20000001";
            DateTime expectedlastChanged = Convert.ToDateTime("2019-10-20T21:19:22.2135489Z");

            // Act
            (string lastChangedBy, DateTime? lastChanged) = InstanceHelper.FindLastChanged(instance);

            // Assert
            Assert.Equal(expectedlastChangedBy, lastChangedBy);
            Assert.Equal(expectedlastChanged, lastChanged);
        }
    }
}

