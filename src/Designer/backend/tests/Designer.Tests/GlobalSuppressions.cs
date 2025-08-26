// This file is used by Code Analysis to maintain SuppressMessage
// attributes that are applied to this project.
// Project-level suppressions either have no target or are given
// a specific target and scoped to a namespace, type, member, etc.

using System.Diagnostics.CodeAnalysis;

[assembly: SuppressMessage("Design", "CA1816: Call GC.SuppressFinalize correctly", Justification = "Used as after each test in xUnit")]
[assembly: SuppressMessage("Design", "CA2007: Do not directly await a Task", Justification = "Tests are not performance critical")]
