"""Eval harness entrypoint: `python -m evals.run --suite matching|retrieval|generation|all`.

Contract (IMPLEMENTATION_PLAN.md §10): every implemented suite must score
≥ EVAL_PASS_THRESHOLD (0.90) or this process exits non-zero — CI blocks on it.
Thresholds only change via explicit human sign-off.

Suite arrival: matching → M3 · retrieval + generation → M6.
"""

import argparse
import sys
from collections.abc import Callable

from app.config import get_settings
from evals.generation.eval import run as run_generation
from evals.matching.eval import run as run_matching
from evals.retrieval.eval import run as run_retrieval

# suite name → runner returning a score in [0, 1]. Populated as milestones land.
SUITES: dict[str, Callable[[], float]] = {
    "matching": run_matching,
    "retrieval": run_retrieval,
    "generation": run_generation,
}

PLANNED = {"matching": "M3", "retrieval": "M6", "generation": "M6"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Mulaqat AI eval suites")
    parser.add_argument(
        "--suite",
        choices=[*PLANNED.keys(), "all"],
        default="all",
    )
    args = parser.parse_args()
    settings = get_settings()

    requested = list(PLANNED.keys()) if args.suite == "all" else [args.suite]
    failed: list[str] = []

    print(f"── Mulaqat eval harness · threshold ≥ {settings.eval_pass_threshold:.2f} ──")
    for name in requested:
        runner = SUITES.get(name)
        if runner is None:
            print(f"  {name:<12} NOT IMPLEMENTED YET (lands in {PLANNED[name]}) — nothing to score")
            continue
        score = runner()
        passed = score >= settings.eval_pass_threshold
        print(f"  {name:<12} score={score:.3f}  {'PASS' if passed else 'FAIL'}")
        if not passed:
            failed.append(name)

    if failed:
        print(f"\nFAILED suites: {', '.join(failed)} — fix the system, never lower the threshold.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
