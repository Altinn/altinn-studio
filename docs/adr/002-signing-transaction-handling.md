# How we handle transactions for signing

-   Status: Accepted
-   Deciders: Johannes Haukland, Bjørn Tore on behalf of Team Apps
-   Date: 02.10.2024

## Result

A2: State - We store transaction state. We retry, skipping the previously succesful steps.

## Problem context

When we talk about a transaction in this context we mean several ordered steps.
We use two categories to describe a step in the context of a transaction:

1. Idempotent - Completing the step multiple times has the same effect as doing it once
   Example: Assigning a role to a person.
2. Non-Idempotent
   Example: Sending a notification to a person.

In the case of signing we have two transactions:

#### Setting signees transaction

1. Delegate right to action **sign** on the signing task.
2. Send a notification to the signee using the correspondence API

#### Signing

1. A signee signs data elements
2. The person in charge of moving the process out of the sign task is notified using the correspondence API

We will refer to step 1 as the **action** and step 2 as the **message**

## Decision drivers

-   B1: We must not send a **message** unless the **action** is successful
-   B2: We must guarantee "at least once delivery" of the **message** if the **action** is successful
-   B3: We should guarantee "exactly once delivery" of the **message** if the **action** is successful
-   B4: We should not rollback idempotent steps if they are to be redone.

## Alternatives considered

-   A1: Rollback - We use a transaction scope. If a step fails then we rollback the previous steps. We retry the transction.
-   A2: State - We store transaction state. We retry, skipping the previously succesful steps.

## Pros and cons

List the pros and cons with the alternatives. This should be in regards to the decision drivers.

### A1

-   Good, because this alternative adheres to all descision drivers
-   Bad, because it does not fullfill the B4 decision driver, leading to unnecessary traffic.

### A2

-   Good, because it adheres to all **must** decision drivers.
