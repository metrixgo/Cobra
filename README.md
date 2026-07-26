# Cobra — Collaborative Block Python IDE with AI Assistant

Cobra is a browser-native, collaborative block-based visual programming environment, Python code generator, and AI assistant inspired by Scratch, Snap!, and Visual Studio Code. Users can assemble statement and expression blocks, nest math/string/logic operators, write Python interactively, get short AI code advice, collaborate in real time with remote users, and run Python directly in the browser via WebAssembly.

---

## Key Concepts & Features

### 1. Visual Block Paradigm & Scratch/Snap! Nesting
Cobra divides programming constructs into two distinct block types:
- **Statement Blocks**: Vertical blocks (Actions, Logic, Variables) that snap sequentially into stacks (`.stack`). They manage program flow such as loops (`count`, `while`), conditionals (`if`, `if_else`), variable assignments (`set`, `change`), and actions (`print`, `ask`).
- **Reporter / Expression Blocks**: Rounded pill blocks (Operators & Variable values) that plug directly into **Input Slots** (`.input-slot`).
- **Input Slots (`.input-slot`)**: Dual-mode input containers present on statement and operator blocks. An input slot functions as an editable text/number input by default, or accepts nested reporter blocks (e.g. `add`, `subtract`, `multiply`, `divide`, `equals`, `greater`, `join`, `pick random`, `variable score`). Reporter blocks can be nested to arbitrary depths (e.g., `print (score + (level * 10))`).

### 2. Lightweight AI Assistant (Gemini API Integration)
- **✨ AI Assistant Sidebar**: Built-in AI panel providing short, 1-3 sentence answers for code review, bug detection, and Python advice.
- **🔍 Analyze Code**: One-click analysis scanning your generated Python code for bugs and logic issues.
- **⚡ Fast & Resource-Efficient**: Configured with token limits for minimal resource consumption and fast responses.
- **🔒 Key Security**: The Gemini API key is stored locally in `ai-config.js` or browser `localStorage` and is gitignored to ensure keys are **never committed**.

### 3. Smart Unified `print` Block
Replaces rigid `print_text` and `print_variable` blocks with a single smart `print [slot]` block. The code generator intelligently analyzes the slot content:
- Formats plain text as Python string literals (`print("Hello World")`).
- Passes variable identifiers directly (`print(score)`).
- Formats nested operator expressions (`print((a + b))`).

### 4. DOM State & HTML Attribute Synchronization
To maintain 1-to-1 fidelity across local storage, page refreshes, and multi-user collaboration:
- Live DOM input `.value` properties are continuously synchronized to HTML `value="..."` attributes via `syncFieldAttributes()`.
- Serialized workspace HTML (`workspaceMarkup()`) captures the exact state of all fields and nested reporter structures.
- Workspace upgrades (`upgradeSavedBlocks()`) handle backward-compatible schema migrations without tearing down valid blocks or resetting field values.

---

## Configuring Your Gemini API Key

You can supply your Gemini API key in **one of two secure ways**:

### Option A: Local Config File (`ai-config.js`)
1. Copy `ai-config.js.template` to `ai-config.js`:
   ```bash
   cp ai-config.js.template ai-config.js
   ```
2. Open `ai-config.js` and set your API key:
   ```javascript
   window.COBRA_AI_CONFIG = {
       apiKey: "YOUR_ACTUAL_GEMINI_API_KEY",
       model: "gemini-1.5-flash"
   };
   ```
3. `ai-config.js` is automatically added to `.gitignore` so your API key stays safe on your computer and is **never committed** to Git.

### Option B: In-App UI Settings Modal ⚙
1. Open Cobra in your browser.
2. Click **✨ AI Assistant** in the top bar.
3. Click the **⚙ Settings** button in the AI header.
4. Paste your Gemini API key and click **Save Key**. The key is saved locally in your browser's `localStorage`.

---

## Technologies Used

### Frontend Core
- **HTML5 & Semantic Structure**: Pure HTML5 layout with accessible palette groups, category jump navigation, program canvas, Python code viewer, output terminal panel, and AI Assistant Copilot sidebar.
- **Vanilla CSS3 (Design Token Architecture)**:
  - Custom Properties (`--blue`, `--cyan`, `--orange`, `--green`, `--gray`).
  - Flexbox and Grid layouts.
  - Custom dashed drop targets (`.stack`, `.input-slot`, `.slot-drag-over`) and rounded reporter pills (`.block.reporter`).
- **Vanilla JavaScript (ES6+)**:
  - Zero external npm frameworks/build tools required for the UI.
  - HTML5 Drag-and-Drop API (`dragstart`, `dragover`, `dragleave`, `drop`, `dragend`).
  - Event binding tracking using JavaScript `WeakSet` (`eventBound`).

### Python Execution Engine (Pyodide & WebAssembly)
- **Pyodide (v0.26.2)**: CPython compiled to WebAssembly (WASM), running natively inside the browser thread. Loaded dynamically from CDN when the user clicks **Run**.
- **Pyodide JS Bridge (`js` module & `builtins.input` override)**:
  - Custom JS bridge (`window.cobraAskInput`) intercepting standard Python `input()` calls at runtime.
- **Smart Auto-Type Converter**:
  - Automatically parses input strings into appropriate Python primitives (`int`, `float`, `bool`, or `str`).

### Real-Time Collaboration & Backend (Firebase)
- **Firebase JS SDK (v10.12.2 Compatibility Build)**:
  - `firebase-app-compat.js` (App initialization).
  - `firebase-firestore-compat.js` (Firestore Database).
- **Cloud Firestore**:
  - Real-time document store (`cobraRooms/{roomId}`).
- **Firebase Hosting**:
  - Distributed Web CDN with `Cache-Control: no-cache, no-store, must-revalidate` headers configured in `firebase.json`.

---

## File Structure

```text
Cobra/
├── index.html                  # Main application UI layout & block palette
├── styles.css                  # UI theme, block styles, input slots & AI panel
├── app.js                      # Block templates, drag-drop engine, code generator, Pyodide runner
├── ai-assistant.js             # Fast Gemini AI advisor engine
├── ai-config.js.template       # Template for local Gemini API credentials
├── ai-config.js                # Local Gemini config file (gitignored)
├── collaboration.js            # Firestore room manager & real-time sync
├── firebase-config.js          # Project Firebase API credentials
├── firebase-config.js.template # Config template for version control
├── firebase.json               # Firebase Hosting & Firestore configuration
├── firestore.rules             # Security rules for room collaboration
└── README.md                   # Project documentation
```

---

## How to Run Locally
Simply open `index.html` directly in any web browser or serve it via a local static file server.
