const canvas = document.getElementById('canvas');
const codeEl = document.getElementById('pythonCode');
const outputEl = document.getElementById('programOutput');
const collaborationStatus = document.getElementById('collaborationStatus');
const eventBound = new WeakSet();
let dragged = null;
let applyingRemoteWorkspace = false;

const field = (name, value, extra = '') => `<input class="field ${extra}" data-field="${name}" value="${value}" spellcheck="false">`;
const remove = () => '<button class="delete-block" title="Remove block" aria-label="Remove block">x</button>';
const nested = (label, branch = '') => `<div class="nested-wrap"><div class="nested-title">${label}</div><div class="stack nested-stack" data-branch="${branch}"></div></div>`;
const templates = {
  print_text: () => `<div class="block print" draggable="true" data-type="print_text"><div class="block-head"><span class="block-label">print text</span>${field('text', 'Hello, Cobra!', 'wide')}${remove()}</div></div>`,
  print_variable: () => `<div class="block print" draggable="true" data-type="print_variable"><div class="block-head"><span class="block-label">print variable</span>${field('name', 'answer')}${remove()}</div></div>`,
  ask: () => `<div class="block ask" draggable="true" data-type="ask"><div class="block-head"><span class="block-label">ask</span>${field('prompt', 'Your question?', 'wide')}<span class="block-label">and store answer in</span>${field('name', 'answer')}${remove()}</div></div>`,
  comment: () => `<div class="block other" draggable="true" data-type="comment"><div class="block-head"><span class="block-label">comment</span>${field('text', 'explain this step', 'wide')}${remove()}</div></div>`,
  set: () => `<div class="block variable" draggable="true" data-type="set"><div class="block-head"><span class="block-label">set</span>${field('name', 'score')}<span class="block-label">to</span>${field('value', '0')}${remove()}</div></div>`,
  change: () => `<div class="block variable" draggable="true" data-type="change"><div class="block-head"><span class="block-label">change</span>${field('name', 'score')}<span class="block-label">by</span>${field('value', '1', 'tiny')}${remove()}</div></div>`,
  count: () => `<div class="block loop" draggable="true" data-type="count"><div class="block-head"><span class="block-label">count</span>${field('name', 'i', 'tiny')}<span class="block-label">from</span>${field('from', '1', 'tiny')}<span class="block-label">to</span>${field('to', '10', 'tiny')}${remove()}</div>${nested('DO')}</div>`,
  if: () => `<div class="block logic" draggable="true" data-type="if"><div class="block-head"><span class="block-label">if</span>${field('condition', 'score > 10', 'wide')}${remove()}</div>${nested('DO')}</div>`,
  if_else: () => `<div class="block logic" draggable="true" data-type="if_else"><div class="block-head"><span class="block-label">if</span>${field('condition', 'score > 10', 'wide')}${remove()}</div>${nested('DO', 'then')}${nested('ELSE', 'else')}</div>`
};
function makeBlock(type) { const holder = document.createElement('div'); holder.innerHTML = templates[type](); return holder.firstElementChild; }
function id(name) { const clean = String(name || 'value').trim().replace(/\W/g, '_').replace(/^\d/, '_'); return clean || 'value'; }
function pyString(text) { return JSON.stringify(String(text || '')); }
function val(block, name) { const el = block.querySelector(`[data-field="${name}"]`); return el ? el.value : ''; }
function fieldValue(input) {
  return input ? (input.value ?? input.getAttribute('value') ?? '') : '';
}
function syncFieldAttributes(container = rootStack) {
  if (!container) return;
  container.querySelectorAll('.field').forEach((input) => {
    input.setAttribute('value', input.value);
  });
}
function workspaceMarkup() {
  syncFieldAttributes(rootStack);
  return rootStack.innerHTML;
}
function applyFieldValues(container) {
  container.querySelectorAll('.field').forEach((input) => {
    const saved = input.getAttribute('value');
    if (saved !== null) input.value = saved;
  });
}
function makeEmptyMessages() { document.querySelectorAll('.stack').forEach((stack) => { const hasBlocks = [...stack.children].some((item) => item.classList.contains('block')); const message = stack.querySelector(':scope > .empty-message'); if (!hasBlocks && !message) { const hint = document.createElement('p'); hint.className = 'empty-message'; hint.textContent = stack.classList.contains('root-stack') ? 'Drop blocks here' : 'Drop actions here'; stack.append(hint); } if (hasBlocks && message) message.remove(); }); }
function codeFrom(stack, indent = '') { return [...stack.children].filter((item) => item.classList.contains('block')).map((block) => { const type = block.dataset.type; if (type === 'print_text') return `${indent}print(${pyString(val(block, 'text'))})\n`; if (type === 'print_variable') return `${indent}print(${id(val(block, 'name'))})\n`; if (type === 'ask') return `${indent}${id(val(block, 'name'))} = input(${pyString(val(block, 'prompt'))})\n`; if (type === 'comment') return `${indent}# ${val(block, 'text')}\n`; if (type === 'set') return `${indent}${id(val(block, 'name'))} = ${val(block, 'value') || '0'}\n`; if (type === 'change') return `${indent}${id(val(block, 'name'))} += ${val(block, 'value') || '1'}\n`; if (type === 'count') { const body = codeFrom(block.querySelector('.nested-stack'), `${indent}    `) || `${indent}    pass\n`; return `${indent}for ${id(val(block, 'name'))} in range(${val(block, 'from') || '0'}, (${val(block, 'to') || '0'}) + 1):\n${body}`; } if (type === 'if') { const body = codeFrom(block.querySelector('.nested-stack'), `${indent}    `) || `${indent}    pass\n`; return `${indent}if ${val(block, 'condition') || 'False'}:\n${body}`; } if (type === 'if_else') { const thenBody = codeFrom(block.querySelector('[data-branch="then"]'), `${indent}    `) || `${indent}    pass\n`; const elseBody = codeFrom(block.querySelector('[data-branch="else"]'), `${indent}    `) || `${indent}    pass\n`; return `${indent}if ${val(block, 'condition') || 'False'}:\n${thenBody}${indent}else:\n${elseBody}`; } return ''; }).join(''); }
function update() { makeEmptyMessages(); const code = codeFrom(document.querySelector('.root-stack')).trimEnd(); codeEl.textContent = code || '# Drag blocks here to generate Python.'; const workspace = workspaceMarkup(); localStorage.setItem('cobra-simple-workspace', workspace); if (!applyingRemoteWorkspace) window.cobraCollaboration?.save(workspace); return code; }
function attachEvents() { document.querySelectorAll('[draggable="true"], .delete-block, .field').forEach((item) => { if (eventBound.has(item)) return; eventBound.add(item); if (item.matches('[draggable="true"]')) { item.addEventListener('dragstart', (event) => { event.stopPropagation(); dragged = item; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.dataset.new || item.dataset.type); if (item.classList.contains('block')) requestAnimationFrame(() => item.classList.add('dragging')); }); item.addEventListener('dragend', (event) => { event.stopPropagation(); item.classList.remove('dragging'); dragged = null; document.querySelectorAll('.drag-over').forEach((element) => element.classList.remove('drag-over')); }); } else if (item.matches('.delete-block')) { item.addEventListener('click', (event) => { event.stopPropagation(); item.closest('.block').remove(); update(); }); } else { item.addEventListener('input', update); item.addEventListener('change', update); } }); }
const rootStack = document.querySelector('.root-stack');
function dropStackFor(target) {
  return target instanceof Element ? target.closest('.nested-stack') || rootStack : rootStack;
}
function clearDropHighlights(except) {
  document.querySelectorAll('.drag-over').forEach((stack) => {
    if (stack !== except) stack.classList.remove('drag-over');
  });
}
function isValidDropTarget(stack) {
  return dragged && !(dragged.classList.contains('block') && dragged.contains(stack));
}
canvas.addEventListener('dragover', (event) => {
  const stack = dropStackFor(event.target);
  if (!isValidDropTarget(stack)) return;
  event.preventDefault();
  clearDropHighlights(stack);
  stack.classList.add('drag-over');
});
canvas.addEventListener('dragleave', (event) => {
  const stack = dropStackFor(event.target);
  if (!stack.contains(event.relatedTarget)) stack.classList.remove('drag-over');
});
function insertAtPointer(stack, block, pointerY) { const siblings = [...stack.children].filter((item) => item.classList.contains('block') && item !== block); const nextBlock = siblings.find((item) => pointerY < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2); if (nextBlock) stack.insertBefore(block, nextBlock); else stack.append(block); }
canvas.addEventListener('drop', (event) => {
  const stack = dropStackFor(event.target);
  if (!isValidDropTarget(stack)) return;
  event.preventDefault();
  clearDropHighlights();
  insertAtPointer(stack, dragged.dataset.new ? makeBlock(dragged.dataset.new) : dragged, event.clientY);
  attachEvents();
  update();
});
function upgradeSavedBlocks() { const changed = { print: 'print_text' }; document.querySelectorAll('.block').forEach((oldBlock) => { const targetType = changed[oldBlock.dataset.type]; if (targetType) { if (!templates[targetType]) { oldBlock.remove(); return; } const values = Object.fromEntries([...oldBlock.querySelectorAll(':scope > .block-head .field')].map((input) => [input.dataset.field, fieldValue(input)])); const oldStacks = [...oldBlock.querySelectorAll(':scope > .nested-wrap > .stack')]; const fresh = makeBlock(targetType); fresh.querySelectorAll(':scope > .block-head .field').forEach((input) => { if (values[input.dataset.field] !== undefined) { input.value = values[input.dataset.field]; input.setAttribute('value', values[input.dataset.field]); } }); fresh.querySelectorAll(':scope > .nested-wrap > .stack').forEach((stack, index) => { if (!oldStacks[index]) return; [...oldStacks[index].children].forEach((child) => stack.append(child)); }); oldBlock.replaceWith(fresh); } }); document.querySelectorAll('.variable-chip, [data-type="use"]').forEach((item) => item.remove()); document.querySelectorAll('[data-bound]').forEach((item) => item.removeAttribute('data-bound')); syncFieldAttributes(rootStack); }
try { const saved = localStorage.getItem('cobra-simple-workspace'); if (saved) { document.querySelector('.root-stack').innerHTML = saved; applyFieldValues(rootStack); } } catch (_) { /* Storage is optional. */ }
upgradeSavedBlocks(); attachEvents(); update();
window.cobraCollaboration?.start({
  getWorkspace: workspaceMarkup,
  applyWorkspace: (workspace) => {
    makeEmptyMessages();
    if (workspace === workspaceMarkup()) return;
    applyingRemoteWorkspace = true;
    rootStack.innerHTML = workspace;
    applyFieldValues(rootStack);
    upgradeSavedBlocks();
    attachEvents();
    update();
    applyingRemoteWorkspace = false;
  },
  setStatus: (message, active) => {
    collaborationStatus.textContent = message;
    collaborationStatus.classList.toggle('active', active);
  }
});
document.getElementById('copyLinkButton').addEventListener('click', async () => {
  const shareUrl = window.cobraCollaboration?.shareUrl() || window.location.href;
  try {
    await navigator.clipboard.writeText(shareUrl);
    collaborationStatus.textContent = 'Share link copied';
  } catch (_) {
    window.prompt('Copy this share link:', shareUrl);
  }
});
document.querySelectorAll('.category-jump').forEach((button) => button.addEventListener('click', () => { const palette = document.querySelector('.palette'); const target = document.getElementById(button.dataset.target); palette.scrollTo({ top: target.offsetTop - palette.offsetTop - 8, behavior: 'smooth' }); }));
document.getElementById('clearButton').addEventListener('click', () => { document.querySelector('.root-stack').innerHTML = ''; attachEvents(); outputEl.textContent = 'Workspace cleared.'; update(); });
document.getElementById('clearOutput').addEventListener('click', () => { outputEl.textContent = ''; });
document.getElementById('exportButton').addEventListener('click', () => { const blob = new Blob([update() || '# Cobra program\n'], { type: 'text/x-python' }); const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'cobra_program.py' }); link.click(); URL.revokeObjectURL(link.href); });
let pyodidePromise;
async function runtime() { if (!pyodidePromise) pyodidePromise = new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js'; script.onload = () => loadPyodide({ stdout: (line) => { outputEl.textContent += `${line}\n`; }, stderr: (line) => { outputEl.textContent += `Error: ${line}\n`; } }).then(resolve, reject); script.onerror = () => reject(new Error('Python runner could not be downloaded. Check your internet connection.')); document.head.append(script); }); return pyodidePromise; }
function appendTerminalText(text) { outputEl.append(document.createTextNode(text)); outputEl.scrollTop = outputEl.scrollHeight; }
function terminalAnswer(prompt) { return new Promise((resolve) => { appendTerminalText(prompt); const input = document.createElement('input'); input.className = 'terminal-input'; input.type = 'text'; input.autocomplete = 'off'; input.setAttribute('aria-label', 'Python input'); outputEl.append(input); input.focus(); input.addEventListener('keydown', (event) => { if (event.key !== 'Enter') return; const answer = input.value; input.replaceWith(document.createTextNode(`${answer}\n`)); resolve(answer); }); }); }
async function collectAnswersInTerminal() { const answers = []; for (const block of document.querySelectorAll('.block[data-type="ask"]')) answers.push(await terminalAnswer(val(block, 'prompt'))); return answers; }
document.getElementById('runButton').addEventListener('click', async () => { const code = update(); if (!code) { outputEl.textContent = 'Add a block before running.'; return; } const button = document.getElementById('runButton'); button.disabled = true; outputEl.textContent = ''; try { const answers = await collectAnswersInTerminal(); appendTerminalText('Starting Python...\n'); const py = await runtime(); py.globals.set('cobra_answers_json', JSON.stringify(answers)); await py.runPythonAsync("import builtins, json\ncobra_answers = iter(json.loads(cobra_answers_json))\nbuiltins.input = lambda prompt='': next(cobra_answers, '')"); await py.runPythonAsync(code); if (!outputEl.textContent) outputEl.textContent = 'Finished with no output.'; } catch (error) { outputEl.textContent += `\n${error.message}`; } finally { button.disabled = false; } });
