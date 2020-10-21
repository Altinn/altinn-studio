using System;
using System.Collections.Generic;

using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;

using Xunit;

namespace Altinn.Platform.Storage.UnitTest.HelperTests
{
    public class InstanceEventHelperTest
    {
        [Fact]
        public void RemoveDuplicateEvents_GivenEmptyList_ReturnEmptyList()
        {
            // Arrange
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>();

            // Act
            List<InstanceEvent> actual = InstanceEventHelper.RemoveDuplicateEvents(instanceEvents);

            // Assert
            Assert.NotNull(actual);
            Assert.Empty(actual);
        }

        [Fact]
        public void RemoveDuplicateEvents_GivenListWithOneEvent_ReturnsListWithSameEvent()
        {
            // Arrange
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>
            {
                new InstanceEvent()
            };

            // Act
            List<InstanceEvent> actual = InstanceEventHelper.RemoveDuplicateEvents(instanceEvents);

            // Assert
            Assert.NotNull(actual);
            Assert.Single(actual);
        }

        [Fact]
        public void RemoveDuplicateEvents_GivenListWithTwoEqualEvents_ReturnsListWithSingleEvent()
        {
            // Arrange
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>
            {
                new InstanceEvent(),
                new InstanceEvent()
            };

            // Act
            List<InstanceEvent> actual = InstanceEventHelper.RemoveDuplicateEvents(instanceEvents);

            // Assert
            Assert.NotNull(actual);
            Assert.Single(actual);
        }

        [Fact]
        public void RemoveDuplicateEvents_GivenListWithTwoUniqueEventsOnEventType_ReturnsListWithSameTwoEvents()
        {
            // Arrange
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>
            {
                new InstanceEvent{ EventType = "Created", User = new PlatformUser { UserId = 12 }, DataId = "33"},
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 }, DataId = "33"}
            };

            // Act
            List<InstanceEvent> actual = InstanceEventHelper.RemoveDuplicateEvents(instanceEvents);

            // Assert
            Assert.NotNull(actual);
            Assert.Collection(
                actual,
                item => Assert.Equal("Created", item.EventType),
                item => Assert.Equal("Saved", item.EventType));
        }

        [Fact]
        public void RemoveDuplicateEvents_GivenListWithTwoConsecutiveSaveEventsFromSameUser_ReturnsListWithSingleEvent()
        {
            // Arrange
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>
            {
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 }, DataId = "33" },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 }, DataId = "33" }
            };

            // Act
            List<InstanceEvent> actual = InstanceEventHelper.RemoveDuplicateEvents(instanceEvents);

            // Assert
            Assert.NotNull(actual);
            Assert.Single(actual);
        }

        [Fact]
        public void RemoveDuplicateEvents_GivenListWithTwoConsecutiveSaveEventsFromSameUserOnDifferentData_ReturnsListWithTwoEvent()
        {
            // Arrange
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>
            {
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 }, DataId = "1" },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 }, DataId = "2" }
            };

            // Act
            List<InstanceEvent> actual = InstanceEventHelper.RemoveDuplicateEvents(instanceEvents);

            // Assert
            Assert.NotNull(actual);
            Assert.Collection(
                actual,
                item => Assert.Equal("1", item.DataId),
                item => Assert.Equal("2", item.DataId));
        }

        [Fact]
        public void RemoveDuplicateEvents_GivenListWithTwoSaveEventsFromTwoUsersInterlaced_ReturnsAllFourEvents()
        {
            // Arrange
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>
            {
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 } },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 14 } },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 } },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 14 } }
            };

            // Act
            List<InstanceEvent> actual = InstanceEventHelper.RemoveDuplicateEvents(instanceEvents);

            // Assert
            Assert.NotNull(actual);
            Assert.Collection(
                actual,
                item => Assert.Equal(12, item.User.UserId),
                item => Assert.Equal(14, item.User.UserId),
                item => Assert.Equal(12, item.User.UserId),
                item => Assert.Equal(14, item.User.UserId));
        }

        [Fact]
        public void RemoveDuplicateEvents_GivenListWithTwoSaveEventsFromTwoUsersGrouped_ReturnsTwoEvents()
        {
            // Arrange
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>
            {
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 } },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 } },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 14 } },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 14 } }
            };

            // Act
            List<InstanceEvent> actual = InstanceEventHelper.RemoveDuplicateEvents(instanceEvents);

            // Assert
            Assert.NotNull(actual);
            Assert.Collection(
                actual,
                item => Assert.Equal(12, item.User.UserId),
                item => Assert.Equal(14, item.User.UserId));
        }

        [Fact]
        public void RemoveDuplicateEvents_GivenListWithFirstAndLastFromOneUserTwoMiddleFromDifferentUser_ReturnsThreeEvents()
        {
            // Arrange
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>
            {
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 }, DataId = "33" },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { OrgId = "ttd" }, DataId = "33" },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { OrgId = "ttd" }, DataId = "33" },
                new InstanceEvent{ EventType = "Saved", User = new PlatformUser { UserId = 12 }, DataId = "33" }
            };

            // Act
            List<InstanceEvent> actual = InstanceEventHelper.RemoveDuplicateEvents(instanceEvents);

            // Assert
            Assert.NotNull(actual);
            Assert.Collection(
                actual,
                item => Assert.Equal(12, item.User.UserId),
                item => Assert.Equal("ttd", item.User.OrgId),
                item => Assert.Equal(12, item.User.UserId));
        }

        [Fact]
        public void RemoveDuplicateEvents_GivenKindOfRealListOfEvents_ReturnsCorrectEvents()
        {
            // Arrange
            DateTime now = DateTime.UtcNow;
            List<InstanceEvent> instanceEvents = new List<InstanceEvent>
            {
                new InstanceEvent // Instance created by user
                {
                    Created = now.AddDays(-6),
                    EventType = "Created",
                    User = new PlatformUser { UserId = 12 }
                },
                new InstanceEvent // Data element created by user
                {
                    Created = now.AddDays(-6).AddMilliseconds(1),
                    EventType = "Created",
                    User = new PlatformUser { UserId = 12 },
                    DataId = "33"
                },
                new InstanceEvent // Data element saved by user
                {
                    Created = now.AddDays(-6).AddMilliseconds(2),
                    EventType = "Saved",
                    User = new PlatformUser { UserId = 12 },
                    DataId = "33"
                },
                new InstanceEvent // Instance saved by user
                {
                    Created = now.AddDays(-6).AddMilliseconds(3),
                    EventType = "Saved",
                    User = new PlatformUser { UserId = 12 }
                },
                new InstanceEvent // Data element saved by user, duplicate of next
                {
                    Created = now.AddDays(-5),
                    EventType = "Saved",
                    User = new PlatformUser { UserId = 12 },
                    DataId = "33"
                },
                new InstanceEvent // Data element saved by user
                {
                    Created = now.AddDays(-5).AddMinutes(3),
                    EventType = "Saved",
                    User = new PlatformUser { UserId = 12 },
                    DataId = "33"
                },
                new InstanceEvent // Instance saved by user
                {
                    Created = now.AddDays(-4),
                    EventType = "Saved",
                    User = new PlatformUser { UserId = 12 }
                },
                new InstanceEvent // Data element created by user
                {
                    Created = now.AddDays(-4).AddMilliseconds(1),
                    EventType = "Created",
                    User = new PlatformUser { UserId = 12 },
                    DataId = "35"
                },
                new InstanceEvent // Data element saved by user, duplicate of next
                {
                    Created = now.AddDays(-4).AddMilliseconds(1),
                    EventType = "Saved",
                    User = new PlatformUser { UserId = 12 },
                    DataId = "35"
                },
                new InstanceEvent // Data element saved by user
                {
                    Created = now.AddDays(-4).AddMinutes(12),
                    EventType = "Saved",
                    User = new PlatformUser { UserId = 12 },
                    DataId = "35"
                },
                new InstanceEvent // Data element created by org
                {
                    Created = now.AddDays(-1),
                    EventType = "Created",
                    User = new PlatformUser { OrgId = "ttd" },
                    DataId = "37"
                },
                new InstanceEvent // Data element saved by org
                {
                    Created = now.AddDays(-1).AddMilliseconds(2),
                    EventType = "Saved",
                    User = new PlatformUser { OrgId = "ttd" },
                    DataId = "37"
                },
                new InstanceEvent // Instance saved by user
                {
                    Created = now.AddMilliseconds(-1),
                    EventType = "Saved",
                    User = new PlatformUser { UserId = 12 }
                },
                new InstanceEvent // User submitted 
                {
                    Created = now,
                    EventType = "Submited", // TYPO!? oh noes... (this was copied from at22)
                    User = new PlatformUser { UserId = 12 }
                }
            };

            // Act
            List<InstanceEvent> actual = InstanceEventHelper.RemoveDuplicateEvents(instanceEvents);

            // Assert
            Assert.NotNull(actual);
            Assert.Equal(12, actual.Count);
        }
    }
}
