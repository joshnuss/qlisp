# qlisp

A toy Lisp interpreter built in a day using Gemini.

[![Open with GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/joshnuss/qlisp)

---

## ✨ Features

* **🔤 Parser, lexer & interpreter** — Tokenizes syntax into an Abstract Syntax Tree (AST), and evaluates code.
* **🖥️ CLI** — Execute `.lisp` files directly from your terminal (`qlisp file.lisp`).
* **🔄 REPL** — Developer code interactively from the terminal (`qlisp`).
* **🧪 Tests** — Full suite powered by Vitest, and custom harness for testing `.lisp` files.
* **🪄 Macros** — Compile-time macro expansion before execution with unquote support to build custom language features.
* **☁️ GitHub Codespaces** — Pre-configured `.devcontainer` environment for developing remotely.

## Installation & Setup

Clone the repository using the GitHub CLI and install dependencies:

```bash
gh repo clone joshnuss/qlisp
cd qlisp
pnpm install
pnpm link --global
```

## Usage

To run the REPL:

```bash
qlisp
```

To run a LISP file:

```
qlisp example.lisp
```

## License

MIT
