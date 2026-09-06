# Contributing

Bug reports and pull requests are welcome. Include your Kapps version, display
mode, browser/profile context, steps to reproduce, and expected vs actual results.
Use synthetic mileage in examples. Never include credentials or unrelated logs.

Edit files in `src/`, run `node tests/accounting.cjs`, then run
`node scripts/build.mjs`. Commit the rebuilt `Odometer/index.html` with your
source changes. Run `python scripts/package.py` to check install packaging.

Changes to distance accounting or storage need tests for session/car changes,
missing telemetry and multiple readers/writers. Mileage must never reset silently.
Keep the installed widget self-contained and free of remote dependencies.

Contributions are distributed under the repository's MIT license.
