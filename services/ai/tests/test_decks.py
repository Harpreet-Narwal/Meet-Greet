from fastapi.testclient import TestClient

from app.decks.generate import _parse_cards
from app.decks.moderate import moderate_cards


def test_moderation_blocks_banned_topics() -> None:
    cards = [
        "What's your monthly salary and net worth?",
        "Which religion is the best one?",
        "What's your most controversial food opinion?",  # fine
    ]
    verdicts = moderate_cards(cards)
    assert verdicts[0].ok is False and "banned_topic" in verdicts[0].reasons
    assert verdicts[1].ok is False and "banned_topic" in verdicts[1].reasons
    assert verdicts[2].ok is True


def test_moderation_enforces_length_and_shape() -> None:
    long = "A" * 200
    # a rhetorical "A or B? which?" is fine; only 3+ questions is "multiple"
    multi = "Who? What? When? Where?"
    verdicts = moderate_cards([long, multi], kind="icebreaker")
    assert "too_long" in verdicts[0].reasons
    assert "multiple_questions" in verdicts[1].reasons


def test_moderation_allows_rhetorical_two_question_card() -> None:
    verdicts = moderate_cards(["Tendulkar or Dravid? Who's the GOAT?"], kind="hot_takes")
    assert verdicts[0].ok is True


def test_moderation_requires_question_shape_for_icebreaker() -> None:
    verdicts = moderate_cards(["Just a statement with no prompt value here."], kind="icebreaker")
    assert verdicts[0].ok is False and "not_a_question" in verdicts[0].reasons


def test_moderation_strips_meta_text() -> None:
    verdicts = moderate_cards(["Here's a fun one: what's your favourite chai?"], kind="icebreaker")
    assert "meta_text" in verdicts[0].reasons


def test_parse_cards_extracts_json_array() -> None:
    raw = 'Sure! ["What is your favourite auto ride story?", "Chai or coffee?"]'
    cards = _parse_cards(raw)
    assert cards == ["What is your favourite auto ride story?", "Chai or coffee?"]


def test_parse_cards_handles_garbage() -> None:
    assert _parse_cards("no json here") == []


def test_moderate_endpoint(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/decks/moderate",
        json={"cards": ["What's your go-to karaoke song?", "What is your salary?"]},
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] == 1
