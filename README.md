# Cobra

A browser-based block coding editor that generates Python as you connect blocks.

## Run it

Open `index.html` in a modern browser with an internet connection. Cobra uses a custom HTML/CSS rectangular block interface with browser drag-and-drop; Pyodide downloads only when **Run** is selected.

## Included in this first mode

- A custom square-block workspace, categorized block palette, direct drag-and-drop, deletion, and nested blocks.
- Cobra blocks: print, inclusive count loop, assignment, variable changes, input, comments, and conditions.
- Live Python code generation, browser-local workspace saving, `.py` export, and an in-page Python runner.

The Python runner collects answers for `ask` blocks before executing the generated code in the browser.

## Deploying Cobra

Cobra is a static website. Firebase Hosting publishes the site, and Cloud Firestore stores shared workspaces so people using the same link can edit together.

### First-time setup

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. In **Build**, create a **Firestore Database**. The default location is fine for this project.
3. In **Project settings**, add a Web app. Firebase will show a configuration object for the app.
4. Copy `firebase-config.js.template` to `firebase-config.js`, then replace the placeholder values with your Firebase config:

   ```powershell
   copy firebase-config.js.template firebase-config.js
   ```

   `firebase-config.js` is gitignored so your API key is not pushed to GitHub. Only the template is committed.

5. Open **Build → Firestore Database → Rules** in Firebase. Replace the rules with the contents of `firestore.rules`, then click **Publish**.

   These rules let anyone with a Cobra room link read and edit that room. Do not store private information in a shared workspace.

6. Install the Firebase command-line tool, then sign in:

   ```powershell
   npm install -g firebase-tools
   firebase login
   ```

7. In this project folder, connect the folder to the Firebase project:

   ```powershell
   firebase init hosting firestore
   ```

   Use these answers when prompted:

   - Select **Use an existing project**, then select the Firebase project you created.
   - Public directory: `.`
   - Configure as a single-page app: **No**
   - Set up GitHub deploys: **No**
   - Overwrite `index.html`: **No**

### Publish the site

From the Cobra project folder, run:

```powershell
firebase deploy
```

Firebase will display a Hosting URL, usually in this format:

```text
https://your-project-id.web.app
```

Open that URL. Cobra will create a room ID in the address automatically. Use **Copy share link** and send the copied URL to anyone who should work in that room.

### Publish updates later

After changing the app, publish the updated files with:

```powershell
firebase deploy
```

If you changed `firestore.rules`, the same command publishes the updated rules too.

### Working without Firebase

If `firebase-config.js` does not contain a Firebase configuration, Cobra still works as a private editor in one browser. Blocks and field values are saved only in that browser, and collaboration is disabled.
