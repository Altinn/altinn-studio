from agents.services.decisions.gates import CONCERNS, RELEVANCE, Judgment


def judgment(relevance: float = 1.0, **concerns: float) -> Judgment:
    """A judgment with these probabilities, and 0 for every concern not named."""
    return Judgment({RELEVANCE: relevance, **dict.fromkeys(CONCERNS, 0.0), **concerns})
