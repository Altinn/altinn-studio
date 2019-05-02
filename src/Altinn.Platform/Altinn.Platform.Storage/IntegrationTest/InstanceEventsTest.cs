using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Client;
using Altinn.Platform.Storage.IntegrationTest.Fixtures;
using Altinn.Platform.Storage.Models;
using Newtonsoft.Json;
using Xunit;

namespace Altinn.Platform.Storage.IntegrationTest
{
    /// <summary>
    ///  Tests dataservice REST api for instance events.
    /// </summary>
    public class InstanceEventsTest : IClassFixture<PlatformStorageFixture>, IDisposable
    {
        private readonly PlatformStorageFixture fixture;
        private readonly HttpClient client;
        private StorageClient storage;
        private readonly string testInstanceId = "5a0d5b04-5a6f-48d7-8790-27b77d485837";

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceEventsTest"/> class.
        /// </summary>
        /// <param name="fixture">the fixture object which talks to the SUT (System Under Test)</param>
        public InstanceEventsTest(PlatformStorageFixture fixture)
        {
            this.fixture = fixture;
            this.client = this.fixture.Client;
            this.storage = new StorageClient(this.client);
        }

        /// <summary>
        /// Make sure repository is cleaned after the tests is run.
        /// </summary>
        public async void Dispose()
        {
            await storage.DeleteInstanceEvents(testInstanceId);
        }

        /// <summary>
        /// Gets all instance events for a given instance id.
        /// Verifies that the number of retrieved events matches what is expected.       
        /// </summary>
        [Fact]
        public async void QueryInstanceEventsOnInstanceId()
        {
            // Assign
            int expectedNoEvents = 3;

            // Act
            await PopulateDatabase();
            List<InstanceEvent> instanceEvents = await storage.GetAllInstanceEvents(testInstanceId);

            // Assert
            Assert.Equal(expectedNoEvents, instanceEvents.Count());
        }

        /// <summary>
        /// Gets all instance events for a given instance Id and list of event types.
        /// Verifies that the number of retrieved events matches what is expected.
        /// </summary>
        [Fact]
        public async void QueryInstanceEventsOnEventTypes()
        {
            // Assign
            int expectedNoEvents = 1;

            // Act
            await PopulateDatabase();
            List<InstanceEvent> instanceEvents = await storage.GetInstanceEventsEventTypes(testInstanceId, new List<string> { "deleted" });

            // Assert
            Assert.Equal(expectedNoEvents, instanceEvents.Count());
        }

        /// <summary>
        /// Gets all instance events for a given instance id and time frame.
        /// Verifies that the number of retrieved events matches what is expected.
        /// </summary>
        [Fact]
        public async void QueryInstanceEventsOnTimeFrame()
        {
            // Assign
            int expectedNoEvents = 3;

            // Act
            await PopulateDatabase();
            string from = DateTime.UtcNow.AddMinutes(-3).ToString("s", CultureInfo.InvariantCulture);
            string to = DateTime.UtcNow.ToString("s", CultureInfo.InvariantCulture);
            List<InstanceEvent> instanceEvents = await storage.GetInstanceEventsTimeframe(testInstanceId, from, to);

            // Assert
            Assert.Equal(expectedNoEvents, instanceEvents.Count());
        }

        private async Task<bool> PopulateDatabase()
        {
            InstanceEvent testEvent01 = new InstanceEvent
            {
                InstanceId = testInstanceId,
                InstanceEventType = "deleted",
                InstanceOwnerId = "12346",
                UserId = 0,
                AuthenticationLevel = 4,
                EndUserSystemId = 1,
                WorkflowStepId = "Step123456"
            };

            InstanceEvent testEvent02 = new InstanceEvent
            {
                InstanceId = testInstanceId,
                InstanceEventType = "submited",
                InstanceOwnerId = "12346",
                UserId = 0,
                AuthenticationLevel = 4,
                EndUserSystemId = 1,
                WorkflowStepId = "Step123456"
            };

            InstanceEvent testEvent03 = new InstanceEvent
            {
                InstanceId = testInstanceId,
                InstanceEventType = "created",
                InstanceOwnerId = "12346",
                UserId = 0,
                AuthenticationLevel = 4,
                EndUserSystemId = 1,
                WorkflowStepId = "Step123456"
            };

            await storage.PostInstanceEvent(testEvent01);
            await storage.PostInstanceEvent(testEvent02);
            await storage.PostInstanceEvent(testEvent03);

            return true;
        }

    }
}
