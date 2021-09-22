// This file is used by Code Analysis to maintain SuppressMessage
// attributes that are applied to this project.
// Project-level suppressions either have no target or are given
// a specific target and scoped to a namespace, type, member, etc.

using System.Diagnostics.CodeAnalysis;

[assembly: SuppressMessage("StyleCop.CSharp.DocumentationRules", "SA1600:Elements should be documented", Justification = "Test description should be in the name of the test.", Scope = "module")]
[assembly: SuppressMessage("Minor Code Smell", "S1481:Unused local variables should be removed", Justification = "Variables are assigned to easy verify the results of serialization.", Scope = "module")]
[assembly: SuppressMessage("Style", "IDE0059:Unnecessary assignment of a value", Justification = "Variables are assigned to easy verify the results of serialization.", Scope = "module")]
