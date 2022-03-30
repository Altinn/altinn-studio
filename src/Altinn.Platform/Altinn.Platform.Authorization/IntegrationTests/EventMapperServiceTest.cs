using System;
using System.Collections.Generic;
using Altinn.Platform.Authorization.IntegrationTests.Util;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Models.DelegationChangeEvent;
using Altinn.Platform.Authorization.Services.Implementation;
using Xunit;

namespace Altinn.Platform.Authorization.IntegrationTests
{
    public class EventMapperServiceTest
    {
        [Fact]
        public void MapToDelegationChangeEventList()
        {
            // Arrange
            EventMapperService mapper = new EventMapperService();

            DateTime now = DateTime.Now;
            DelegationChangeEventList expected = new DelegationChangeEventList
            {
                DelegationChangeEvents = new List<DelegationChangeEvent>
                {
                    new DelegationChangeEvent
                    {
                        EventType = DelegationChangeEventType.Grant,
                        DelegationChange = new SimpleDelegationChange
                        {
                            DelegationChangeId = 1,
                            AltinnAppId = "ttd/testapp",
                            OfferedByPartyId = 123,
                            CoveredByPartyId = 234,
                            PerformedByUserId = 567,
                            Created = now
                        }
                    }
                }
            };

            List<DelegationChange> input = new List<DelegationChange>()
            {
                new DelegationChange()
                {
                    DelegationChangeId = 1,
                    DelegationChangeType = DelegationChangeType.Grant,
                    AltinnAppId = "ttd/testapp",
                    OfferedByPartyId = 123,
                    CoveredByPartyId = 234,
                    PerformedByUserId = 567,
                    BlobStoragePolicyPath = "ttd/testapp/123/p234/delegationpolicy.xml",
                    BlobStorageVersionId = now.ToString(),
                    Created = now
                }
            };

            // Act
            DelegationChangeEventList actual = mapper.MapToDelegationChangeEventList(input);

            // Assert
            AssertionUtil.AssertEqual(expected, actual);
        }
    }
}
