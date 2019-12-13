using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Text;

namespace Altinn.App.PlatformServices.Models
{
    public class ProcessStateChange
    {
        public ProcessState OldProcessState { get; set; }

        public ProcessState NewProcessState { get; set; }

        public List<InstanceEvent> Events { get; set; }
        
    }
}
