# Stack validation prototypes

This directory contains throwaway acceptance experiments for the risky stack choices. Prototype code must not become a production dependency without a documented decision and production tests.

The acceptance corpus is declared in `tests/fixtures/acceptance/manifest.json`. The target profile is 1,000 documents and at least 10 MiB of indexed content, generated from the representative fixtures without shrinking the corpus after a failed measurement.

Each prototype must record its exact command, environment, corpus revision, measurements, and decision in `docs/superpowers/reports/stack-validation.md`.
