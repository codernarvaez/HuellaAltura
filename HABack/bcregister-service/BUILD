# bcregister-service — notario Polygon + Resend
#   pants run HABack/bcregister-service:ci

shell_sources(name="ci_scripts", sources=["pants_ci.sh"])

files(
    name="service_files",
    sources=[
        "app/**/*.py",
        "tests/**/*.py",
        "pyproject.toml",
        "requirements.txt",
        "requirements-dev.txt",
    ],
)

run_shell_command(
    name="ci",
    command="./pants_ci.sh",
    workdir=".",
    execution_dependencies=[":ci_scripts", ":service_files"],
    tags=["ci", "haback", "bcregister-service"],
)

run_shell_command(
    name="lint",
    command="ruff check app tests && ruff format --check app tests",
    workdir=".",
    execution_dependencies=[":service_files"],
    tags=["lint", "haback", "bcregister-service"],
)
