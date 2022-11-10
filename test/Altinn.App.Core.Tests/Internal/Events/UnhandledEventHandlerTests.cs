using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.Core.Internal.Events;
using FluentAssertions;
using Xunit;

namespace Altinn.App.PlatformServices.Tests.Internal.Events
{
    public class UnhandledEventHandlerTests
    {
        [Fact]
        public void ProcessEvent_ShouldThrowNotImplementedException()
        {
            var handler = new UnhandledEventHandler();

            Action action = () => handler.ProcessEvent(null);

            action.Should().Throw<NotImplementedException>();
        }
    }
}
