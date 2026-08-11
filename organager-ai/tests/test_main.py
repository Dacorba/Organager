import unittest

from main import (
    AnalyzeRequest,
    ContainerIn,
    analyze_point,
    clean_text,
    extract_time,
)


class CleanTextTests(unittest.TestCase):
    def test_common_portuguese_errors_are_corrected(self):
        self.assertEqual(
            clean_text("  Nao esquecer  reuniao amanha as 9  "),
            "Não esquecer reunião amanhã às 9",
        )

    def test_project_codes_and_unknown_words_are_preserved(self):
        self.assertEqual(
            clean_text("Rever AMS-01 com RoviSys"),
            "Rever AMS-01 com RoviSys",
        )


class ExtractTimeTests(unittest.TestCase):
    def test_project_code_is_not_interpreted_as_time(self):
        self.assertIsNone(extract_time("Rever AMS-01"))

    def test_invalid_times_are_rejected(self):
        for text in (
            "Reunião às 24:00",
            "Reunião às 12:99",
            "Reunião às 12h99",
            "Reunião 25:00",
        ):
            with self.subTest(text=text):
                self.assertIsNone(extract_time(text))

    def test_valid_times_are_normalized(self):
        cases = {
            "Reunião às 9": "09:00",
            "Reunião às 09:30": "09:30",
            "Reunião 9h15": "09:15",
        }

        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertEqual(extract_time(text), expected)


class AnalyzePointTests(unittest.TestCase):
    def test_no_signals_keeps_low_confidence(self):
        result = analyze_point(
            AnalyzeRequest(
                workspaceId="personal",
                rawText="Comprar pão",
                containers=[],
            )
        )

        self.assertEqual(result.confidence, 0.35)
        self.assertIsNone(result.timeText)
        self.assertIsNone(result.dateISO)

    def test_container_code_matches_without_becoming_a_time(self):
        result = analyze_point(
            AnalyzeRequest(
                workspaceId="rovisys",
                rawText="Rever documentação do AMS-01",
                containers=[ContainerIn(id="proj-1", name="AMS-01")],
            )
        )

        self.assertEqual(result.containerId, "proj-1")
        self.assertEqual(result.confidence, 0.96)
        self.assertIsNone(result.timeText)


if __name__ == "__main__":
    unittest.main()
