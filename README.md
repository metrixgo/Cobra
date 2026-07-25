# Cobra

A browser-based block coding editor that generates Python as you connect blocks.

## Run it

Open `index.html` in a modern browser with an internet connection. The block editor is built directly with HTML, CSS, JavaScript, and browser drag-and-drop; it downloads Pyodide only when **Run** is selected.

## Included in this first mode

- A custom square-block workspace, categorized block palette, direct drag-and-drop, deletion, and nested blocks.
- Cobra blocks: print, inclusive count loop, assignment, variable changes, input, comments, and conditions.
- Live Python code generation, browser-local workspace saving, `.py` export, and an in-page Python runner.

The Python runner works for programs that do not need interactive terminal input. `ask` generates Python's `input()` correctly, but browser execution cannot currently supply a response prompt.
