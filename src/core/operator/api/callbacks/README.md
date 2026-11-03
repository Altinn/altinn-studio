# Callback contract examples

These files are examples of the callback contract between operator-workflow-engine and the core operator. The
[operator README](../../README.md#callback-contract) describes the contract.

The tests of both sides read them: the engine's tests check that `OperatorCommand` sends and reads this shape, and the
operator's tests check that its callback router decodes and encodes it. Change them together with both sides.
