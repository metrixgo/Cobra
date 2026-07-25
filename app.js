const canvas = document.getElementById('canvas');
const codeEl = document.getElementById('pythonCode');
const outputEl = document.getElementById('programOutput');
const collaborationStatus = document.getElementById('collaborationStatus');
const eventBound = new WeakSet();
let dragged = null;
let applyingRemoteWorkspace = false;

const field = (name, value, extra = '') => `<input class="field ${extra}" data-field="${name}" value="${value}" spellcheck="false">`;
const slot = (name, value, extra = '') => `<div class="input-slot" data-slot="${name}">${field(name, value, extra)}</div>`;
const remove = () => '<button class="delete-block" title="Remove block" aria-label="Remove block">x</button>';
const nested = (label, branch = '') => `<div class="nested-wrap"><div class="nested-title">${label}</div><div class="stack nested-stack" data-branch="${branch}"></div></div>`;
const templates = {
  // Statement blocks
  print: () => `<div class="block print" draggable="true" data-type="print"><div class="block-head"><span class="block-label">print</span>${slot('text', 'Hello World', 'wide')}${remove()}</div></div>`,
  ask: () => `<div class="block ask" draggable="true" data-type="ask"><div class="block-head"><span class="block-label">ask</span>${slot('prompt', 'Your question?', 'wide')}<span class="block-label">and store in</span>${field('name', 'answer')}${remove()}</div></div>`,
  comment: () => `<div class="block other" draggable="true" data-type="comment"><div class="block-head"><span class="block-label">comment</span>${field('text', 'explain this step', 'wide')}${remove()}</div></div>`,
  set: () => `<div class="block variable" draggable="true" data-type="set"><div class="block-head"><span class="block-label">set</span>${field('name', 'score')}<span class="block-label">to</span>${slot('value', '0')}${remove()}</div></div>`,
  change: () => `<div class="block variable" draggable="true" data-type="change"><div class="block-head"><span class="block-label">change</span>${field('name', 'score')}<span class="block-label">by</span>${slot('value', '1', 'tiny')}${remove()}</div></div>`,
  count: () => `<div class="block loop" draggable="true" data-type="count"><div class="block-head"><span class="block-label">count</span>${field('name', 'i', 'tiny')}<span class="block-label">from</span>${slot('from', '1', 'tiny')}<span class="block-label">to</span>${slot('to', '10', 'tiny')}${remove()}</div>${nested('DO')}</div>`,
  if: () => `<div class="block logic" draggable="true" data-type="if"><div class="block-head"><span class="block-label">if</span>${slot('condition', 'score > 10', 'wide')}${remove()}</div>${nested('DO')}</div>`,
  if_else: () => `<div class="block logic" draggable="true" data-type="if_else"><div class="block-head"><span class="block-label">if</span>${slot('condition', 'score > 10', 'wide')}${remove()}</div>${nested('DO', 'then')}${nested('ELSE', 'else')}</div>`,
  while: () => `<div class="block loop" draggable="true" data-type="while"><div class="block-head"><span class="block-label">while</span>${slot('condition', 'score < 10', 'wide')}${remove()}</div>${nested('DO')}</div>`,

  // Reporter & Operator blocks
  var_get: () => `<div class="block reporter variable" draggable="true" data-type="var_get"><span class="block-label">variable</span>${field('name', 'score', 'tiny')}${remove()}</div>`,
  add: () => `<div class="block reporter operator" draggable="true" data-type="add">${slot('a', '1', 'tiny')}<span class="block-label">+</span>${slot('b', '1', 'tiny')}${remove()}</div>`,
  subtract: () => `<div class="block reporter operator" draggable="true" data-type="subtract">${slot('a', '1', 'tiny')}<span class="block-label">-</span>${slot('b', '1', 'tiny')}${remove()}</div>`,
  multiply: () => `<div class="block reporter operator" draggable="true" data-type="multiply">${slot('a', '2', 'tiny')}<span class="block-label">*</span>${slot('b', '3', 'tiny')}${remove()}</div>`,
  divide: () => `<div class="block reporter operator" draggable="true" data-type="divide">${slot('a', '10', 'tiny')}<span class="block-label">/</span>${slot('b', '2', 'tiny')}${remove()}</div>`,
  equals: () => `<div class="block reporter operator" draggable="true" data-type="equals">${slot('a', 'score', 'tiny')}<span class="block-label">==</span>${slot('b', '10', 'tiny')}${remove()}</div>`,
  greater: () => `<div class="block reporter operator" draggable="true" data-type="greater">${slot('a', 'score', 'tiny')}<span class="block-label">&gt;</span>${slot('b', '0', 'tiny')}${remove()}</div>`,
  less: () => `<div class="block reporter operator" draggable="true" data-type="less">${slot('a', 'score', 'tiny')}<span class="block-label">&lt;</span>${slot('b', '100', 'tiny')}${remove()}</div>`,
  and: () => `<div class="block reporter operator" draggable="true" data-type="and">${slot('a', 'a', 'tiny')}<span class="block-label">and</span>${slot('b', 'b', 'tiny')}${remove()}</div>`,
  or: () => `<div class="block reporter operator" draggable="true" data-type="or">${slot('a', 'a', 'tiny')}<span class="block-label">or</span>${slot('b', 'b', 'tiny')}${remove()}</div>`,
  join: () => `<div class="block reporter operator" draggable="true" data-type="join"><span class="block-label">join</span>${slot('a', 'Hello ', 'tiny')}<span class="block-label">and</span>${slot('b', 'World', 'tiny')}${remove()}</div>`,
  length: () => `<div class="block reporter operator" draggable="true" data-type="length"><span class="block-label">length of</span>${slot('a', 'text', 'wide')}${remove()}</div>`,
  random: () => `<div class="block reporter operator" draggable="true" data-type="random"><span class="block-label">pick random</span>${slot('a', '1', 'tiny')}<span class="block-label">to</span>${slot('b', '10', 'tiny')}${remove()}</div>`
};

function makeBlock(type) { const holder = document.createElement('div'); holder.innerHTML = templates[type] ? templates[type]() : ''; return holder.firstElementChild; }
function isReporter(element) { return element && element.classList && element.classList.contains('reporter'); }
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
  container.querySelectorAll('.input-slot').forEach((slotContainer) => {
    const hasReporter = [...slotContainer.children].some((c) => c.classList.contains('reporter'));
    const input = slotContainer.querySelector(':scope > .field');
    if (input) input.style.display = hasReporter ? 'none' : '';
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

function getSlot(container, name) {
  return container ? container.querySelector(`:scope > .block-head > .input-slot[data-slot="${name}"], :scope > .input-slot[data-slot="${name}"]`) : null;
}

function evalExpr(block) {
  if (!block) return '';
  const type = block.dataset.type;
  if (type === 'var_get') return id(val(block, 'name'));
  if (type === 'add') return `(${evalSlot(getSlot(block, 'a'))} + ${evalSlot(getSlot(block, 'b'))})`;
  if (type === 'subtract') return `(${evalSlot(getSlot(block, 'a'))} - ${evalSlot(getSlot(block, 'b'))})`;
  if (type === 'multiply') return `(${evalSlot(getSlot(block, 'a'))} * ${evalSlot(getSlot(block, 'b'))})`;
  if (type === 'divide') return `(${evalSlot(getSlot(block, 'a'))} / ${evalSlot(getSlot(block, 'b'))})`;
  if (type === 'equals') return `(${evalSlot(getSlot(block, 'a'))} == ${evalSlot(getSlot(block, 'b'))})`;
  if (type === 'greater') return `(${evalSlot(getSlot(block, 'a'))} > ${evalSlot(getSlot(block, 'b'))})`;
  if (type === 'less') return `(${evalSlot(getSlot(block, 'a'))} < ${evalSlot(getSlot(block, 'b'))})`;
  if (type === 'and') return `(${evalSlot(getSlot(block, 'a'))} and ${evalSlot(getSlot(block, 'b'))})`;
  if (type === 'or') return `(${evalSlot(getSlot(block, 'a'))} or ${evalSlot(getSlot(block, 'b'))})`;
  if (type === 'join') return `(str(${evalSlot(getSlot(block, 'a'), true)}) + str(${evalSlot(getSlot(block, 'b'), true)}))`;
  if (type === 'length') return `len(str(${evalSlot(getSlot(block, 'a'), true)}))`;
  if (type === 'random') return `random.randint(${evalSlot(getSlot(block, 'a'))}, ${evalSlot(getSlot(block, 'b'))})`;
  return '';
}

function evalSlot(slotContainer, isStringContext = false) {
  if (!slotContainer) return isStringContext ? '""' : '0';
  const reporterChild = [...slotContainer.children].find((child) => child.classList.contains('reporter'));
  if (reporterChild) return evalExpr(reporterChild);

  const input = slotContainer.querySelector('.field');
  const text = input ? input.value.trim() : '';
  if (!text) return isStringContext ? '""' : '0';

  if (isStringContext) {
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text;
    if (!isNaN(text) || text === 'True' || text === 'False') return text;
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text)) return text;
    return pyString(text);
  }
  return text;
}

function codeFrom(stack, indent = '') {
  return [...stack.children].filter((item) => item.classList.contains('block') && !item.classList.contains('reporter')).map((block) => {
    const type = block.dataset.type;
    if (type === 'print' || type === 'print_text') return `${indent}print(${evalSlot(getSlot(block, 'text'), true)})\n`;
    if (type === 'print_variable') return `${indent}print(${id(val(block, 'name'))})\n`;
    if (type === 'ask') return `${indent}${id(val(block, 'name'))} = input(${evalSlot(getSlot(block, 'prompt'), true)})\n`;
    if (type === 'comment') return `${indent}# ${val(block, 'text')}\n`;
    if (type === 'set') return `${indent}${id(val(block, 'name'))} = ${evalSlot(getSlot(block, 'value')) || '0'}\n`;
    if (type === 'change') return `${indent}${id(val(block, 'name'))} += ${evalSlot(getSlot(block, 'value')) || '1'}\n`;
    if (type === 'count') {
      const body = codeFrom(block.querySelector('.nested-stack'), `${indent}    `) || `${indent}    pass\n`;
      return `${indent}for ${id(val(block, 'name'))} in range(${evalSlot(getSlot(block, 'from')) || '0'}, (${evalSlot(getSlot(block, 'to')) || '0'}) + 1):\n${body}`;
    }
    if (type === 'if') {
      const body = codeFrom(block.querySelector('.nested-stack'), `${indent}    `) || `${indent}    pass\n`;
      return `${indent}if ${evalSlot(getSlot(block, 'condition')) || 'False'}:\n${body}`;
    }
    if (type === 'if_else') {
      const thenBody = codeFrom(block.querySelector('[data-branch="then"]'), `${indent}    `) || `${indent}    pass\n`;
      const elseBody = codeFrom(block.querySelector('[data-branch="else"]'), `${indent}    `) || `${indent}    pass\n`;
      return `${indent}if ${evalSlot(getSlot(block, 'condition')) || 'False'}:\n${thenBody}${indent}else:\n${elseBody}`;
    }
    if (type === 'while') {
      const body = codeFrom(block.querySelector('.nested-stack'), `${indent}    `) || `${indent}    pass\n`;
      return `${indent}while ${evalSlot(getSlot(block, 'condition')) || 'False'}:\n${body}`;
    }
    return '';
  }).join('');
}

function update() {
  makeEmptyMessages();
  let code = codeFrom(document.querySelector('.root-stack')).trimEnd();
  if (document.querySelector('.block[data-type="random"]')) {
    code = 'import random\n\n' + code;
  }
  codeEl.textContent = code || '# Drag blocks here to generate Python.';
  const workspace = workspaceMarkup();
  localStorage.setItem('cobra-simple-workspace', workspace);
  if (!applyingRemoteWorkspace) window.cobraCollaboration?.save(workspace);
  return code;
}

function attachEvents() {
  document.querySelectorAll('[draggable="true"], .delete-block, .field').forEach((item) => {
    if (eventBound.has(item)) return;
    eventBound.add(item);
    if (item.matches('[draggable="true"]')) {
      item.addEventListener('dragstart', (event) => {
        event.stopPropagation();
        dragged = item;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.dataset.new || item.dataset.type);
        if (item.classList.contains('block')) requestAnimationFrame(() => item.classList.add('dragging'));
      });
      item.addEventListener('dragend', (event) => {
        event.stopPropagation();
        item.classList.remove('dragging');
        dragged = null;
        clearDropHighlights();
      });
    } else if (item.matches('.delete-block')) {
      item.addEventListener('click', (event) => {
        event.stopPropagation();
        item.closest('.block').remove();
        update();
      });
    } else {
      item.addEventListener('input', update);
      item.addEventListener('change', update);
    }
  });
}

const rootStack = document.querySelector('.root-stack');
function dropStackFor(target) {
  return target instanceof Element ? target.closest('.nested-stack') || rootStack : rootStack;
}

function clearDropHighlights(except) {
  document.querySelectorAll('.drag-over, .slot-drag-over').forEach((element) => {
    if (element !== except) element.classList.remove('drag-over', 'slot-drag-over');
  });
}

function isValidDropTarget(stack) {
  return dragged && !(dragged.classList.contains('block') && dragged.contains(stack));
}

function isReporterDrag(draggedItem) {
  if (!draggedItem) return false;
  if (draggedItem.classList.contains('reporter')) return true;
  const newType = draggedItem.dataset.new;
  if (newType && templates[newType]) {
    const testBlock = makeBlock(newType);
    return isReporter(testBlock);
  }
  return false;
}

canvas.addEventListener('dragover', (event) => {
  if (!dragged) return;
  const targetSlot = event.target.closest('.input-slot');
  if (targetSlot && isReporterDrag(dragged) && !dragged.contains(targetSlot)) {
    event.preventDefault();
    event.stopPropagation();
    clearDropHighlights(targetSlot);
    targetSlot.classList.add('slot-drag-over');
    return;
  }
  const stack = dropStackFor(event.target);
  if (!isValidDropTarget(stack)) return;
  event.preventDefault();
  clearDropHighlights(stack);
  stack.classList.add('drag-over');
});

canvas.addEventListener('dragleave', (event) => {
  const targetSlot = event.target.closest('.input-slot');
  if (targetSlot && !targetSlot.contains(event.relatedTarget)) {
    targetSlot.classList.remove('slot-drag-over');
  }
  const stack = dropStackFor(event.target);
  if (!stack.contains(event.relatedTarget)) stack.classList.remove('drag-over');
});

function insertAtPointer(stack, block, pointerY) {
  const siblings = [...stack.children].filter((item) => item.classList.contains('block') && item !== block);
  const nextBlock = siblings.find((item) => pointerY < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2);
  if (nextBlock) stack.insertBefore(block, nextBlock); else stack.append(block);
}

canvas.addEventListener('drop', (event) => {
  if (!dragged) return;
  const targetSlot = event.target.closest('.input-slot');
  if (targetSlot && isReporterDrag(dragged) && !dragged.contains(targetSlot)) {
    event.preventDefault();
    event.stopPropagation();
    clearDropHighlights();
    const newBlock = dragged.dataset.new ? makeBlock(dragged.dataset.new) : dragged;
    // Replace any existing reporter in the slot
    [...targetSlot.children].filter(c => c.classList.contains('reporter')).forEach(c => c.remove());
    targetSlot.append(newBlock);
    attachEvents();
    update();
    return;
  }
  const stack = dropStackFor(event.target);
  if (!isValidDropTarget(stack)) return;
  event.preventDefault();
  clearDropHighlights();
  insertAtPointer(stack, dragged.dataset.new ? makeBlock(dragged.dataset.new) : dragged, event.clientY);
  attachEvents();
  update();
});

function upgradeSavedBlocks() {
  const changed = { print_text: 'print', print_variable: 'print' };
  document.querySelectorAll('.block').forEach((oldBlock) => {
    const targetType = changed[oldBlock.dataset.type];
    if (targetType) {
      if (!templates[targetType]) { oldBlock.remove(); return; }
      const values = Object.fromEntries([...oldBlock.querySelectorAll(':scope > .block-head .field')].map((input) => [input.dataset.field, fieldValue(input)]));
      const fresh = makeBlock(targetType);
      if (oldBlock.dataset.type === 'print_variable') {
        const varBlock = makeBlock('var_get');
        const input = varBlock.querySelector('[data-field="name"]');
        if (input && values.name) {
          input.value = values.name;
          input.setAttribute('value', values.name);
        }
        const slotText = fresh.querySelector('[data-slot="text"]');
        if (slotText) slotText.append(varBlock);
      } else {
        fresh.querySelectorAll('.field').forEach((input) => {
          if (values[input.dataset.field] !== undefined) {
            input.value = values[input.dataset.field];
            input.setAttribute('value', values[input.dataset.field]);
          }
        });
      }
      oldBlock.replaceWith(fresh);
    }
  });
  document.querySelectorAll('.variable-chip, [data-type="use"]').forEach((item) => item.remove());
  document.querySelectorAll('[data-bound]').forEach((item) => item.removeAttribute('data-bound'));
  syncFieldAttributes(rootStack);
}
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

window.cobraAskInput = function(promptText) {
  const answer = window.prompt(promptText || 'Input:') ?? '';
  const text = promptText ? `${promptText} ${answer}\n` : `${answer}\n`;
  appendTerminalText(text);
  return answer;
};

document.getElementById('runButton').addEventListener('click', async () => {
  const code = update();
  if (!code) {
    outputEl.textContent = 'Add a block before running.';
    return;
  }
  const button = document.getElementById('runButton');
  button.disabled = true;
  outputEl.textContent = '';
  try {
    appendTerminalText('Starting Python...\n');
    const py = await runtime();
    await py.runPythonAsync(`import builtins, js

def _cobra_parse_type(v):
    s = str(v).strip()
    if not s:
        return ""
    try:
        return int(s)
    except ValueError:
        pass
    try:
        return float(s)
    except ValueError:
        pass
    if s.lower() == "true":
        return True
    if s.lower() == "false":
        return False
    return s

def _cobra_input(prompt=""):
    raw = js.cobraAskInput(str(prompt))
    return _cobra_parse_type(raw if raw is not None else "")

builtins.input = _cobra_input
`);
    await py.runPythonAsync(code);
    if (!outputEl.textContent || outputEl.textContent === 'Starting Python...\n') {
      outputEl.textContent += 'Finished with no output.';
    }
  } catch (error) {
    outputEl.textContent += `\n${error.message}`;
  } finally {
    button.disabled = false;
  }
});
