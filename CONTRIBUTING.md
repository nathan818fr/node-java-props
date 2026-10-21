# Contributing

The goal is to keep a simple project without unnecessary features: please open an issue to discuss a new feature
before working on it.

## Development

Requirements: Node.js, [pnpm](https://pnpm.io/) and [Biome](https://biomejs.dev/). Their versions are pinned in
`.config/mise.toml`: with [mise](https://mise.jdx.dev/), `mise install` installs them.

```bash
mise install            # optional: installs the pinned tools
pnpm install
pnpm test               # unit tests (with coverage)
pnpm test -u            # update the snapshots (test/**/*-snapshot.json) after an intended change
pnpm run lint           # Biome + type-check
pnpm run test:compat    # build, then check the package (test/compat/run-smoke.js also runs on Node.js >= 6)
```

## Java reference

Java is the reference: the Java results of the test cases (`test/cases/*-expected.json`, `test/fixtures`) are generated
and checked by running real JVMs, one or more per behavior era of `Properties.load()` (see `src/internal/java-version.ts`). The
fuzzer compares `parse` and `stringify` with `javaVersion` to each JVM, on random inputs.
It needs `javac` from a JDK 9+ on the `PATH`, and the JDKs to compare:

```bash
# JDKs to use (default: java from PATH): name=/path/to/bin/java,...
export JAVA_REFERENCE_JDKS="8=/opt/jdk8/bin/java,11.0.4=/opt/jdk-11.0.4/bin/java,25=/opt/jdk25/bin/java"
pnpm run reference:gen               # regenerate
pnpm run reference:check             # verify
pnpm run reference:fuzz              # random inputs (builds first; --runs N, --seed N to replay a failure)
```

A monthly CI job (`.github/workflows/latest-jdks.yml`) also checks the latest GA and early-access JDKs, to catch a
behavior change in a new Java release.

## Compatibility

Existing users must never break: the runtime behavior, the exports (including `java-props/dist/*` deep imports) and
the supported environments (Node.js >= 6, ES2015, TypeScript >= 2.9) are checked in CI.

Releases follow [SemVer](https://semver.org/).
