# Studio assistant LLM cost allocation

- Status: Proposed
- Deciders: Team
- Date: 16.04.2026

## Result

## Problem context

The Studio assistant feature allows service owners to ask questions and make changes to an app on their behalf. The LLM costs scale based on the number of requests sent by the service owner to the agent.

## Decision drivers

- D1: Costs accrued by service owners should in principle be forwarded. [Gjør litt mer spesifikk]
- D2: The agreement about about charging service owner accrued costs is instated from 2027. [Dobbelsjekk at dette stemmer]
- D3: Nice to have: Users should be able to monitor accrued costs.

## Alternatives considered

- A1: Service owners are charged from the minute they have access.
- A2: Service owners are charged at the beginning of 2027.
- A3: Service owners are not charged for LLM costs at all.

## Pros and cons

### A1

- Good with regards to D1. Follows cost forwarding principle.
- Bad with regards to D2. We have no agreement for forwarding these kind of costs until 2027. [Dobbeltsjekk at dette stemmer]
- Bad with regards to D3. There is currently no GUI to monitor costs for service owners.

### A2

- Good with regards to D1. Costs will eventually be forwarded to service owners.
- Bad with regards to D1. Digdir will foot the bill until the end of 2026.
- Good with regards to D2. Matches service owner agreement.
- Good with regards to D3. Will give us time to implement a cost overview in the admin dashboard.

### A3

- Bad with regards to D1. Does not follow the priniple of forwarding service owner specific costs.
- Good with regards to D2. No costs, no agreement needed.
- Good with regards to D3. No costs, no cost monitoring GUI needed.
