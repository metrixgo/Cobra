# Cobra

A browser-based block coding editor that generates Python as you connect blocks.

## Run it

Open `index.html` in a modern browser with an internet connection. The page loads Blockly for the block editor and downloads Pyodide only when **Run** is selected.

## Included in this first mode

- Snap-together Blockly workspace, categorized block palette, zoom, grid, trash can, and nested blocks.
- Custom Cobra blocks: print, inclusive count loop, assignment, input, and comments.
- Standard Blockly blocks for variables, conditions, loops, text, numbers, arithmetic, and comparisons.
- Live Python code generation, browser-local workspace saving, `.py` export, and an in-page Python runner.

The Python runner works for programs that do not need interactive terminal input. `ask` generates Python's `input()` correctly, but browser execution cannot currently supply a response prompt.
