using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;

using Altinn.Process.Elements;

using Xunit;

namespace Altinn.Process.UnitTest
{
    /// <summary>
    /// Represents a collection of unit test with all unit tests of the <see cref="BpmnReader"/> class.
    /// </summary>
    public class BpmnReaderTest
    {
        /// <summary>
        /// Scenario:
        ///   Create a new <see cref="BpmnReader"/> instance using a stream with the BPMN description.
        /// Expected result:
        ///   Instance is successfully created.
        /// Success criteria:
        ///   Instance is correctly initialized.
        /// </summary>
        [Fact]
        public void Create_InputBpmnDescriptionAsStream_ReturnsInitializedBpmnReader()
        {
            // Arrange
            Stream definitions = LoadResourceAsStream("Altinn.Process.UnitTest.TestData.default_process.bpmn");

            // Act
            BpmnReader actual = BpmnReader.Create(definitions);

            // Assert
            Assert.NotNull(actual);
        }

        /// <summary>
        /// Scenario:
        ///   Create a new <see cref="BpmnReader"/> instance using a string with the BPMN description.
        /// Expected result:
        ///   Instance is successfully created.
        /// Success criteria:
        ///   Instance is correctly initialized.
        /// </summary>
        [Fact]
        public void Create_InputBpmnDescriptionAsString_ReturnsInitializedBpmnReader()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.multiple_events.bpmn");

            // Act
            BpmnReader actual = BpmnReader.Create(definitions);

            // Assert
            Assert.NotNull(actual);
        }

        /// <summary>
        /// Scenario:
        ///   Attempt to retrieve an element from the BPMN based on a unique id.
        /// Expected result:
        ///   Operation returns successfully.
        /// Success criteria:
        ///   Returned element info have the expected property values.
        /// </summary>
        [Theory]
        [InlineData("Submit_1", "Task", "submit")]
        [InlineData("FormFilling_1", "Task", "formfilling")]
        [InlineData("EndEvent_1", "EndEvent", null)]
        [InlineData("StartEvent_1", "StartEvent", null)]
        public void GetElementInfo_AskForExistingElement_ReturnsInfoAboutElement(string id, string elementType, string taskType)
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.default_process.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            // Act
            ElementInfo actual = target.GetElementInfo(id);

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(id, actual.Id);
            Assert.Equal(elementType, actual.ElementType);
            Assert.Equal(taskType, actual.AltinnTaskType);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a simple process with single start event. Attempt to get element info giving null as input.
        /// Expected result:
        ///   Method throws exception
        /// Success criteria:
        ///   Thrown exception is of the correct type.
        /// </summary>
        [Fact]
        public void GetElementInfo_AskForElementInfoForElementNull_ThrowsArgumentNullException()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.default_process.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            ArgumentNullException actual = null;

            // Act
            try
            {
                _ = target.GetElementInfo(null);
            }
            catch (ArgumentNullException ane)
            {
                actual = ane;
            }

            // Assert
            Assert.NotNull(actual);
            Assert.IsType<ArgumentNullException>(actual);
            Assert.Equal("elementId", actual.ParamName);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a simple process with single start event. Attempting to find the id of the initial element.
        /// Expected result:
        ///   Method returns successfully.
        /// Success criteria:
        ///   Returned task id match the expected value.
        /// </summary>
        [Fact]
        public void GetStartElementId_ProcessWithOneStartEvent_IdentifyInitialTask()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.default_process.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            // Act
            string actual = target.GetStartElementId();

            // Assert
            Assert.NotNull(actual);
            Assert.Equal("FormFilling_1", actual);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a process that has two start events, two tasks and two end events.
        ///   Ask for the start of the process. Throws an exception.
        /// Expected result:
        ///   Method throws an exception
        /// Success criteria:
        ///   Thrown exception is of the correct type.
        /// </summary>
        [Fact]
        public void GetStartElementId_ProcessWithTwoStartEvents_IdentifyInitialTask_ThrowsProcessException()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.multiple_events.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            ProcessException actual = null;

            // Act
            try
            {
                _ = target.GetStartElementId();
            }
            catch (ProcessException pe)
            {
                actual = pe;
            }

            // Assert
            Assert.NotNull(actual);
            Assert.IsType<ProcessException>(actual);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a simple process with two tasks. Asking for list of possible options for next step.
        /// Expected result:
        ///   Method returns successfully.
        /// Success criteria:
        ///   Returned list of element ids contains the correct values.
        /// </summary>
        [Theory]
        [InlineData("FormFilling_1", "Submit_1")]
        [InlineData("Submit_1", "EndEvent_1")]
        public void NextElements_DefinitionsHaveTwoTasks_AskForNextStepAfterFirst_ReturnsNextElementId(string currentId, string nextId)
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.default_process.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            // Act
            List<string> actual = target.NextElements(currentId);

            // Assert
            Assert.NotNull(actual);
            Assert.Single(actual);
            Assert.Equal(nextId, actual[0]);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a simple process with two tasks. Attempting to find the id of the next element without current element.
        /// Expected result:
        ///   Method throws an exception
        /// Success criteria:
        ///   Thrown exception is an ArgumentNullException
        /// </summary>
        [Fact]
        public void NextElements_DefinitionsHaveTwoTasks_AskForNextStepWithoutCurrent_ThrowsArgumentNullException()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.default_process.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            ArgumentNullException actual = null;

            // Act
            try
            {
                _ = target.NextElements(null);
            }
            catch (ArgumentNullException ane)
            {
                actual = ane;
            }

            // Assert
            Assert.NotNull(actual);
            Assert.IsType<ArgumentNullException>(actual);
            Assert.Equal("elementId", actual.ParamName);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a process that has two start events, two tasks and two end events.
        ///   Attempt to determine correct task based on the id of a start event.
        /// Expected result:
        ///   Method returns successfully
        /// Success criteria:
        ///   Returned value match the expected task.
        /// </summary>
        [Fact]
        public void NextElements_AskForNextStepFromStartEvent_ReturnsNextTaskId()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.multiple_events.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            // Act
            List<string> actual = target.NextElements("StartEvent_0mau26i");

            // Assert
            Assert.NotNull(actual);
            Assert.Single(actual);
            Assert.Equal("Task_14svrga", actual[0]);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a process that has two start events, two tasks and two end events.
        ///   Ask for next element giving in the id of last task
        /// Expected result:
        ///   Method returns successfully.
        /// Success criteria:
        ///   Returned list contains both end events.
        /// </summary>
        [Fact]
        public void NextElements_DefinitionHasTwoEndEvents_AskForNextStepFromLastTask_ReturnsIdOfBothEndEvents()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.multiple_events.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            // Act
            List<string> actual = target.NextElements("Task_08wkkve");

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(2, actual.Count);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a process that has two start events, two tasks and two end events.
        ///   Ask for next element giving in an id value that does not exist in the process.
        /// Expected result:
        ///   Method throws an exception
        /// Success criteria:
        ///   Thrown exception is an ProcessException
        /// </summary>
        [Fact]
        public void NextElements_AskForNextStepWithANonexistingId_ThrowsProcessException()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.multiple_events.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            ProcessException actual = null;

            // Act
            try
            {
                _ = target.NextElements("donotexist");
            }
            catch (ProcessException pe)
            {
                actual = pe;
            }

            // Assert
            Assert.NotNull(actual);
            Assert.IsType<ProcessException>(actual);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a simple process with one start event, two tasks, and one end event. Ask for a list of all start events.
        /// Expected result:
        ///   Method returns successfully.
        /// Success criteria:
        ///   Returned list holds all expected values.
        /// </summary>
        [Fact]
        public void StartEvents_DefinitionHasOneStartEvent_AskForStartEvents_ReturnsSingleStartEvent()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.default_process.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            // Act
            List<string> actual = target.StartEvents();

            // Assert
            Assert.NotNull(actual);
            Assert.Single(actual);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a simple process with one start event, two tasks, and one end event. Ask for a list of all tasks.
        /// Expected result:
        ///   Method returns successfully.
        /// Success criteria:
        ///   Returned list holds all expected values.
        /// </summary>
        [Fact]
        public void Tasks_DefinitionHasTwoTasks_AskForTask_ReturnsAllTasks()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.default_process.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            // Act
            List<string> actual = target.Tasks();

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(2, actual.Count);
        }

        /// <summary>
        /// Scenario:
        ///   Initialized with a process that has two start events, two tasks and two end events.
        ///   Ask for a list of all end events.
        /// Expected result:
        ///   Method returns successfully.
        /// Success criteria:
        ///   Returned list holds all expected values.
        /// </summary>
        [Fact]
        public void EndEvents_DefinitionHasTwoEndEvent_AskForEndEvent_ReturnsEndEvents()
        {
            // Arrange
            string definitions = LoadResourceAsString("Altinn.Process.UnitTest.TestData.multiple_events.bpmn");
            BpmnReader target = BpmnReader.Create(definitions);

            // Act
            List<string> actual = target.EndEvents();

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(2, actual.Count);
        }

        private static string LoadResourceAsString(string resource)
        {
            Stream dataStream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resource);
            using (TextReader tr = new StreamReader(dataStream))
            {
                return tr.ReadToEnd();
            }
        }

        private static Stream LoadResourceAsStream(string resource)
        {
            return Assembly.GetExecutingAssembly().GetManifestResourceStream(resource);
        }
    }
}
