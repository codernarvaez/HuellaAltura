# HAFront — Astro (npm workspace `hafront`)
#   pants run HAFront:ci

shell_sources(name="ci_scripts", sources=["pants_ci.sh"])

files(
    name="app_sources",
    sources=[
        "package.json",
        "astro.config.mjs",
        "tsconfig.json",
        "src/**",
        "public/**",
        ".env.example",
    ],
)

run_shell_command(
    name="ci",
    command="./pants_ci.sh",
    workdir=".",
    execution_dependencies=[":ci_scripts", ":app_sources"],
    tags=["ci", "hafront", "frontend"],
)

run_shell_command(
    name="lint",
    command="npm run lint",
    workdir=".",
    execution_dependencies=[":app_sources"],
    tags=["lint", "hafront", "frontend"],
)

run_shell_command(
    name="build",
    command="npm run build",
    workdir=".",
    execution_dependencies=[":app_sources"],
    tags=["build", "hafront", "frontend"],
)
