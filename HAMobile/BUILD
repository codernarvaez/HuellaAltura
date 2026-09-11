# HAMobile — Expo (npm workspace `hamobile`)
#   pants run HAMobile:ci

shell_sources(name="ci_scripts", sources=["pants_ci.sh"])

files(
    name="app_sources",
    sources=[
        "package.json",
        "app.json",
        "app.config.js",
        "App.js",
        "index.js",
        "babel.config.js",
        "metro.config.js",
        "tsconfig.json",
        "scripts/**",
        "src/**",
        "assets/**",
    ],
)

run_shell_command(
    name="ci",
    command="./pants_ci.sh",
    workdir=".",
    execution_dependencies=[":ci_scripts", ":app_sources"],
    tags=["ci", "hamobile", "mobile"],
)

run_shell_command(
    name="lint",
    command="npm run lint",
    workdir=".",
    execution_dependencies=[":app_sources"],
    tags=["lint", "hamobile", "mobile"],
)

run_shell_command(
    name="build",
    command="npm run build",
    workdir=".",
    execution_dependencies=[":app_sources"],
    tags=["build", "hamobile", "mobile"],
)
