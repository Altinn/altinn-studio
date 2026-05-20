"""Unit-tester for tools.py. Stdlib unittest, no third-party deps."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS))

from tools import (  # noqa: E402
    TOOL_DEFINITIONS,
    TOOL_REGISTRY,
    age_at_date_from_fnr,
    count_attachments,
    days_between,
    dispatch,
    lookup_kommune,
    path_value,
    text_contains_any,
    text_matches_any,
    time_within_legal_schedule,
)


JULEBORD_FIXTURE = Path(__file__).resolve().parents[4] / "examples" / "applications" / "julebord-kristiansand.json"


class AgeFromFnrTests(unittest.TestCase):
    def test_sophie_salt_born_1990(self):
        # fnr 01039012345: dd=01, mm=03, yy=90, indiv=123 -> 1900+90 = 1990-03-01
        result = age_at_date_from_fnr("01039012345", "2026-05-20")
        self.assertEqual(result, {"age": 36, "birthdate": "1990-03-01"})

    def test_age_just_before_birthday(self):
        # Reference date one day before 20th birthday
        result = age_at_date_from_fnr("01039012345", "2010-02-28")
        self.assertEqual(result["age"], 19)

    def test_age_on_birthday(self):
        result = age_at_date_from_fnr("01039012345", "2010-03-01")
        self.assertEqual(result["age"], 20)

    def test_invalid_fnr_length(self):
        self.assertIn("error", age_at_date_from_fnr("12345", "2026-01-01"))

    def test_invalid_fnr_non_numeric(self):
        self.assertIn("error", age_at_date_from_fnr("abcdefghijk", "2026-01-01"))

    def test_invalid_date(self):
        self.assertIn("error", age_at_date_from_fnr("01039012345", "not-a-date"))

    def test_d_number(self):
        # D-nummer: day +40. 41039012345 -> 1990-03-01 (same as Sophie)
        result = age_at_date_from_fnr("41039012345", "2026-05-20")
        self.assertEqual(result["birthdate"], "1990-03-01")


class DaysBetweenTests(unittest.TestCase):
    def test_one_day(self):
        self.assertEqual(days_between("2026-12-12", "2026-12-13"), {"days": 1})

    def test_julebord_varighet(self):
        self.assertEqual(days_between("2026-12-12", "2026-12-13"), {"days": 1})

    def test_two_weeks(self):
        self.assertEqual(days_between("2026-01-01", "2026-01-15"), {"days": 14})

    def test_same_day(self):
        self.assertEqual(days_between("2026-05-20", "2026-05-20"), {"days": 0})

    def test_negative(self):
        self.assertEqual(days_between("2026-12-13", "2026-12-12"), {"days": -1})

    def test_invalid_date(self):
        self.assertIn("error", days_between("2026-13-99", "2026-12-12"))


class TimeWithinLegalScheduleTests(unittest.TestCase):
    def test_julebord_19_to_02_group3_ok(self):
        # Julebord-fixturet: 19:00-02:00, gruppe tre. Innenfor 13:00-03:00.
        result = time_within_legal_schedule("19:00", "02:00", "gruppeTre")
        self.assertEqual(result, {"within": True, "group": "3", "law": "13:00-03:00"})

    def test_group3_starts_too_early(self):
        result = time_within_legal_schedule("12:00", "02:00", "brennevin")
        self.assertFalse(result["within"])
        self.assertEqual(result["group"], "3")

    def test_group3_ends_too_late(self):
        result = time_within_legal_schedule("13:00", "04:00", "gruppe tre")
        self.assertFalse(result["within"])

    def test_group1_2_morning_to_late(self):
        result = time_within_legal_schedule("06:00", "03:00", "gruppe 1 og 2")
        self.assertEqual(result, {"within": True, "group": "1-2", "law": "06:00-03:00"})

    def test_group1_2_ends_too_late(self):
        result = time_within_legal_schedule("06:00", "04:00", "øl")
        self.assertFalse(result["within"])

    def test_invalid_time(self):
        self.assertIn("error", time_within_legal_schedule("25:00", "02:00", "gruppe 3"))


class LookupKommuneTests(unittest.TestCase):
    def test_kristiansand_4204(self):
        self.assertEqual(lookup_kommune("4204"), {"name": "Kristiansand", "fylke": "Agder"})

    def test_vennesla_4205(self):
        self.assertEqual(lookup_kommune("4205"), {"name": "Vennesla", "fylke": "Agder"})

    def test_unknown(self):
        self.assertIn("error", lookup_kommune("9999"))

    def test_empty(self):
        self.assertIn("error", lookup_kommune(""))


class PathValueTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = json.loads(JULEBORD_FIXTURE.read_text(encoding="utf-8"))

    def test_simple_path(self):
        result = path_value(self.app, "FlatData.Kommunenummer")
        self.assertEqual(result, {"value": "4204", "present": True})

    def test_indexed_path(self):
        result = path_value(self.app, "FlatData.Arrangement.ArrangementPeriode[0].StartDato")
        self.assertEqual(result, {"value": "2026-12-12", "present": True})

    def test_missing_intermediate(self):
        result = path_value(self.app, "FlatData.NonExistent.Field")
        self.assertEqual(result["present"], False)
        self.assertEqual(result["missing_at"], "FlatData.NonExistent")

    def test_missing_index(self):
        result = path_value(self.app, "FlatData.Arrangement.ArrangementPeriode[99].StartDato")
        self.assertEqual(result["present"], False)

    def test_null_value_is_present_with_value(self):
        # OrganisasjonsInformasjon.Organisasjonsnummer is null in fixture
        result = path_value(self.app, "FlatData.OrganisasjonsInformasjon.Organisasjonsnummer")
        self.assertEqual(result, {"value": None, "present": True})


class CountAttachmentsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = json.loads(JULEBORD_FIXTURE.read_text(encoding="utf-8"))

    def test_count_empty(self):
        # Julebord-fixturet har ingen vedlegg → 0
        result = count_attachments(self.app)
        self.assertEqual(result["count"], 0)
        self.assertEqual(result["names"], [])

    def test_count_with_filter_empty(self):
        result = count_attachments(self.app, name_contains="plantegning")
        self.assertEqual(result["count"], 0)

    def test_count_synthetic(self):
        synthetic = {"Vedlegg": [
            {"FileName": "plantegning.pdf"},
            {"FileName": "leiekontrakt.pdf"},
            {"FileName": "Politiattest_styrer.pdf"},
        ]}
        result = count_attachments(synthetic)
        self.assertEqual(result["count"], 3)

    def test_count_with_filter(self):
        synthetic = {"Vedlegg": [
            {"FileName": "plantegning.pdf"},
            {"FileName": "leiekontrakt.pdf"},
        ]}
        result = count_attachments(synthetic, name_contains="plan")
        self.assertEqual(result["count"], 1)
        self.assertEqual(result["names"], ["plantegning.pdf"])


class TextMatchAnyTests(unittest.TestCase):
    def test_julebord_in_enum(self):
        r = text_matches_any("julebord", ["julebord", "firmafest", "bryllup", "konsert"])
        self.assertEqual(r, {"match": True, "matched": "julebord"})

    def test_case_insensitive(self):
        r = text_matches_any("JULEBORD", ["julebord"])
        self.assertTrue(r["match"])

    def test_no_match(self):
        r = text_matches_any("idrettsstevne", ["julebord", "firmafest"])
        self.assertFalse(r["match"])

    def test_strip(self):
        r = text_matches_any("  julebord  ", ["julebord"])
        self.assertTrue(r["match"])


class TextContainsAnyTests(unittest.TestCase):
    def test_restaurant_in_sjohuset(self):
        r = text_contains_any("Restaurant Sjøhuset", ["restaurant", "kro", "pub"])
        self.assertEqual(r, {"contains": True, "matched": "restaurant"})

    def test_brennevin_in_gruppe3(self):
        r = text_contains_any("gruppeTre", ["tre", "3", "brennevin"])
        self.assertTrue(r["contains"])

    def test_no_match(self):
        r = text_contains_any("Forsamlingshus", ["restaurant", "kro", "pub"])
        self.assertFalse(r["contains"])


class DispatchTests(unittest.TestCase):
    def test_dispatch_known_tool(self):
        result = dispatch("days_between", {"from_date": "2026-12-12", "to_date": "2026-12-13"})
        self.assertEqual(result, {"days": 1})

    def test_dispatch_unknown_tool(self):
        result = dispatch("nonexistent", {})
        self.assertIn("error", result)
        self.assertIn("Unknown tool", result["error"])

    def test_dispatch_injects_application(self):
        # path_value needs application but LLM shouldn't pass it
        app = {"FlatData": {"x": 42}}
        result = dispatch("path_value", {"json_path": "FlatData.x"}, application=app)
        self.assertEqual(result, {"value": 42, "present": True})

    def test_dispatch_bad_args(self):
        result = dispatch("days_between", {"wrong_arg": "x"})
        self.assertIn("error", result)


class SchemaConsistencyTests(unittest.TestCase):
    """Each tool name in TOOL_REGISTRY must have a matching TOOL_DEFINITIONS entry,
    and vice versa, with the same required/optional argument sets."""

    def test_registry_and_definitions_match(self):
        registry_names = set(TOOL_REGISTRY.keys())
        definition_names = {d["function"]["name"] for d in TOOL_DEFINITIONS}
        self.assertEqual(registry_names, definition_names)

    def test_required_params_match_python_signature(self):
        import inspect
        for tool_def in TOOL_DEFINITIONS:
            name = tool_def["function"]["name"]
            fn = TOOL_REGISTRY[name]
            sig = inspect.signature(fn)
            python_required = {
                p.name for p in sig.parameters.values()
                if p.default is inspect.Parameter.empty
                and p.name not in ("application",)  # injected by dispatch
            }
            schema_required = set(tool_def["function"]["parameters"].get("required", []))
            self.assertEqual(
                python_required, schema_required,
                f"Tool {name}: python required={python_required}, schema required={schema_required}"
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
