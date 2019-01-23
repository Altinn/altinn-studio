using System;
using System.Collections.Generic;
using System.Text;
using System.Xml.Serialization;

namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class representing a workflow
    /// </summary>
    public class Workflow
    {
        /// <summary>
        /// Class representing the definitions
        /// </summary>
        [XmlTypeAttribute(Namespace = "http://www.omg.org/spec/BPMN/20100524/MODEL")]
        [XmlRootAttribute("definitions", Namespace = "http://www.omg.org/spec/BPMN/20100524/MODEL")]
        public class Definitions
        {
            /// <summary>
            /// Gets or sets the ID of the definition
            /// </summary>
            [XmlAttribute("id")]
            public string Id { get; set; }

            /// <summary>
            /// Gets or sets the target namespace of the definition
            /// </summary>
            [XmlAttribute("targetNamespace")]
            public string TargetNamespace { get; set; }

            /// <summary>
            /// Gets or sets the process of the workflow
            /// </summary>
            [XmlElement("process")]
            public Process Process { get; set; }
        }

        /// <summary>
        /// Class representing the process of a workflow
        /// </summary>
        public class Process
        {
            /// <summary>
            /// Gets or sets the ID of the process of a workflow
            /// </summary>
            [XmlAttribute("id")]
            public string Id { get; set; }

            /// <summary>
            /// Gets or sets if the process of a workflow is executable or not
            /// </summary>
            [XmlAttribute("isExecutable")]
            public bool IsExecutable { get; set; }

            /// <summary>
            /// Gets or sets the start event of the process of a workflow
            /// </summary>
            [XmlElement("startEvent")]
            public StartEvent StartEvent { get; set; }

            /// <summary>
            /// Gets or sets the list of tasks for the process of a workflow
            /// </summary>
            [XmlElement("task")]
            public List<Task> Task { get; set; }

            /// <summary>
            /// Gets or sets the end event of the process of a workflow
            /// </summary>
            [XmlElement("endEvent")]
            public EndEvent EndEvent { get; set; }

            /// <summary>
            /// Gets or sets the sequence flow of the process of a workflow
            /// </summary>
            [XmlElement("sequenceFlow")]
            public List<SequenceFlow> SequenceFlow { get; set; }
        }

        /// <summary>
        /// Class representing the start event of a process
        /// </summary>
        public class StartEvent
        {
            /// <summary>
            /// Gets or sets the ID of the start event of a process
            /// </summary>
            [XmlAttribute("id")]
            public string Id { get; set; }

            /// <summary>
            /// Gets or sets the outgoing id of the start event of a process
            /// </summary>
            [XmlElement("outgoing")]
            public string Outgoing { get; set; }
        }

        /// <summary>
        /// Class representing the task of a process
        /// </summary>
        public class Task
        {
            /// <summary>
            /// Gets or sets the ID of a task
            /// </summary>
            [XmlAttribute("id")]
            public string Id { get; set; }

            /// <summary>
            /// Gets or sets the name of a task
            /// </summary>
            [XmlAttribute("name")]
            public string Name { get; set; }

            /// <summary>
            /// Gets or sets the incoming id of a task
            /// </summary>
            [XmlElement("incoming")]
            public string Incoming { get; set; }

            /// <summary>
            /// Gets or sets the outgoing id of a task
            /// </summary>
            [XmlElement("outgoing")]
            public string Outgoing { get; set; }
        }

        /// <summary>
        /// Class representing the end event of a process
        /// </summary>
        public class EndEvent
        {
            /// <summary>
            /// Gets or sets the ID of a end event
            /// </summary>
            [XmlAttribute("id")]
            public string Id { get; set; }

            /// <summary>
            /// Gets or sets the incoming id of a end event
            /// </summary>
            [XmlElement("incoming")]
            public string Incoming { get; set; }
        }

        /// <summary>
        /// Class representing the sequence flow of a process
        /// </summary>
        public class SequenceFlow
        {
            /// <summary>
            /// Gets or sets the ID of a sequence flow
            /// </summary>
            [XmlAttribute("id")]
            public string Id { get; set; }

            /// <summary>
            /// Gets or sets the source reference of a sequence flow
            /// </summary>
            [XmlAttribute("sourceRef")]
            public string SourceRef { get; set; }

            /// <summary>
            /// Gets or sets the target reference of a sequence flow
            /// </summary>
            [XmlAttribute("targetRef")]
            public string TargetRef { get; set; }
        }
    }
}
