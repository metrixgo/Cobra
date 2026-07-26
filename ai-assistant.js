(function () {
  const getApiKey = () => {
    const configKey = window.COBRA_AI_CONFIG?.apiKey;
    if (configKey && configKey !== 'YOUR_GEMINI_API_KEY_HERE') return configKey;
    return localStorage.getItem('cobra-ai-key') || '';
  };

  const getModel = () => {
    const localModel = localStorage.getItem('cobra-ai-model');
    if (localModel) return localModel;
    const configModel = window.COBRA_AI_CONFIG?.model;
    if (configModel) return configModel;
    return 'gemini-1.5-flash';
  };

  const systemPrompt = `You are a concise Python AI assistant. Respond with plain prose only — 1 to 3 sentences, no bullet points, no labels, no headers, no quotes around your answer, and no meta commentary.`;

  const META_LABELS = /^(Input|Task|Constraint|Constraints|Code|Language|Functionality|Bugs|Output|Python Code)\s*:/i;
  const META_CHECK = /^(Direct answer|No repetition|No bullet|No thinking|\d+\s*-\s*\d+\s+sentences)\b/i;

  function isMetaLine(content) {
    if (META_LABELS.test(content)) return true;
    if (META_CHECK.test(content)) return true;
    if (/\?\s*(Yes|No)\.?\s*$/i.test(content)) return true;
    if (/^["'].+["']\s*\(\d+\s+sentences?\)\.?\s*$/i.test(content)) return true;
    return false;
  }

  function extractReplyContent(raw) {
    if (!raw) return raw;

    const answers = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const content = trimmed.replace(/^[\*\-•]\s*/, '').trim();
      if (!content || isMetaLine(content)) continue;

      if (/^[\*\-•]/.test(trimmed) || !/:\s/.test(content) || content.split(':')[0].split(/\s/).length > 3) {
        const unquoted = content.replace(/^["'](.+)["']\s*(\(\d+\s+sentences?\))?\.?\s*$/i, '$1').trim();
        if (unquoted.length > 10) answers.push(unquoted);
      }
    }

    const unique = [];
    for (const answer of answers) {
      const lower = answer.toLowerCase();
      if (!unique.some((existing) => {
        const el = existing.toLowerCase();
        return el.includes(lower) || lower.includes(el);
      })) {
        unique.push(answer);
      }
    }

    let result = unique.join(' ').trim();
    if (!result) {
      result = raw.replace(/^\s*[\*\-•]\s*/gm, '').replace(META_LABELS, '').trim();
    }

    const sentences = result.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [result];
    return sentences.slice(0, 3).join('').trim() || raw.trim();
  }

  // Dynamic Model Discovery via ListModels API
  async function discoverModels(apiKey) {
    if (!apiKey) return [];
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.models || !Array.isArray(data.models)) return [];

      return data.models
        .filter(m => {
          const name = m.name.toLowerCase();
          const methods = m.supportedGenerationMethods || [];
          return (
            methods.includes('generateContent') &&
            !name.includes('tts') &&
            !name.includes('embedding') &&
            !name.includes('imagen') &&
            !name.includes('aqa') &&
            !name.includes('audio')
          );
        })
        .map(m => m.name.replace(/^models\//, ''));
    } catch (_) {
      return [];
    }
  }

  // Call Gemini REST API with maxOutputTokens constraint for fast, short replies
  async function callGemini(messages) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API_KEY_MISSING');
    }

    const userPreferred = getModel();
    const discovered = await discoverModels(apiKey);

    const candidateModels = [
      userPreferred,
      ...discovered,
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro',
      'gemini-2.0-flash'
    ].filter((v, i, a) => {
      if (!v || a.indexOf(v) !== i) return false;
      const name = v.toLowerCase();
      return !name.includes('tts') && !name.includes('embedding') && !name.includes('imagen') && !name.includes('audio');
    });

    const contents = [];

    messages.forEach(m => {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }]
      });
    });

    let lastError = null;
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              maxOutputTokens: 300,
              temperature: 0.2
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) return extractReplyContent(candidateText);
        }

        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || `HTTP ${response.status} (${model})`;
        lastError = new Error(msg);

        if (response.status === 404 || response.status === 429 || msg.includes('not found') || msg.includes('Quota exceeded') || msg.includes('limit: 0')) {
          continue;
        } else {
          throw lastError;
        }
      } catch (err) {
        lastError = err;
        if (err.message && (err.message.includes('not found') || err.message.includes('Quota exceeded') || err.message.includes('429'))) {
          continue;
        }
        throw err;
      }
    }

    throw lastError || new Error('Failed to obtain response from Gemini API.');
  }

  // AI Assistant UI Controller
  let conversationHistory = [];

  function initUI() {
    const toggleButton = document.getElementById('aiToggleButton');
    const aiPanel = document.getElementById('aiPanel');
    const closeButton = document.getElementById('closeAiPanel');
    const messagesEl = document.getElementById('aiMessages');
    const promptInput = document.getElementById('aiPromptInput');
    const sendButton = document.getElementById('sendAiButton');
    const analyzeButton = document.getElementById('analyzeCodeButton');
    const apiKeyButton = document.getElementById('aiApiKeyButton');
    const settingsModal = document.getElementById('aiSettingsModal');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');
    const modalApiKeyInput = document.getElementById('modalApiKeyInput');
    const modalModelSelect = document.getElementById('modalModelSelect');
    const closeSettingsButton = document.getElementById('closeSettingsModal');

    if (!aiPanel) return;

    const togglePanel = () => {
      document.querySelector('.app-shell')?.classList.toggle('ai-panel-open');
    };

    toggleButton?.addEventListener('click', togglePanel);
    closeButton?.addEventListener('click', togglePanel);

    apiKeyButton?.addEventListener('click', async () => {
      const key = getApiKey();
      if (modalApiKeyInput) modalApiKeyInput.value = key;

      if (key && modalModelSelect) {
        const available = await discoverModels(key);
        if (available.length > 0) {
          modalModelSelect.innerHTML = available.map(m => `<option value="${m}">${m}</option>`).join('');
        }
        modalModelSelect.value = getModel();
      }
      settingsModal.classList.add('visible');
    });

    closeSettingsButton?.addEventListener('click', () => {
      settingsModal.classList.remove('visible');
    });

    saveApiKeyButton?.addEventListener('click', () => {
      const key = modalApiKeyInput ? modalApiKeyInput.value.trim() : '';
      const selectedModel = modalModelSelect ? modalModelSelect.value : 'gemini-1.5-flash';

      if (key) {
        localStorage.setItem('cobra-ai-key', key);
      } else {
        localStorage.removeItem('cobra-ai-key');
      }

      localStorage.setItem('cobra-ai-model', selectedModel);
      appendMessage('system', `Settings saved! Model: ${selectedModel}`);
      settingsModal.classList.remove('visible');
    });

    const formatMarkdown = (text) => {
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/```python([\s\S]*?)```/g, '<pre class="python-code"><code>$1</code></pre>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    };

    function appendMessage(role, text) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `ai-message ${role}`;

      const avatar = document.createElement('div');
      avatar.className = 'ai-avatar';
      avatar.textContent = role === 'user' ? 'U' : (role === 'system' ? '⚙' : '🤖');

      const contentDiv = document.createElement('div');
      contentDiv.className = 'ai-message-content';
      contentDiv.innerHTML = formatMarkdown(text);

      messageDiv.append(avatar, contentDiv);
      messagesEl.append(messageDiv);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function handleSend(userText) {
      const text = userText || promptInput.value.trim();
      if (!text) return;

      if (!getApiKey()) {
        appendMessage('system', '🔑 No Gemini API key found. Click Settings (⚙) to enter your key.');
        return;
      }

      appendMessage('user', text);
      if (!userText) promptInput.value = '';

      const codeEl = document.getElementById('pythonCode');
      const currentCode = codeEl ? codeEl.textContent.trim() : '';
      const outputEl = document.getElementById('programOutput');
      const currentOutput = outputEl ? outputEl.textContent.trim() : '';

      let apiPrompt = text;
      if (currentCode && !currentCode.startsWith('# Drag blocks')) {
        apiPrompt += `\n\nCode:\n${currentCode}`;
      }
      if (currentOutput && currentOutput !== 'Run your blocks to see output here.' && currentOutput !== 'Workspace cleared.') {
        apiPrompt += `\n\nOutput:\n${currentOutput}`;
      }

      conversationHistory.push({ role: 'user', text: apiPrompt });

      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'ai-message assistant loading';
      loadingDiv.innerHTML = '<div class="ai-avatar">🤖</div><div class="ai-message-content">Thinking…</div>';
      messagesEl.append(loadingDiv);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      try {
        const responseText = await callGemini(conversationHistory);
        loadingDiv.remove();
        conversationHistory.push({ role: 'assistant', text: responseText });
        appendMessage('assistant', responseText);
      } catch (err) {
        loadingDiv.remove();
        if (err.message === 'API_KEY_MISSING') {
          appendMessage('system', '🔑 Please set your Gemini API key in Settings (⚙).');
        } else {
          appendMessage('system', `Error: ${err.message}`);
        }
      }
    }

    sendButton?.addEventListener('click', () => handleSend());
    promptInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    analyzeButton?.addEventListener('click', () => {
      const codeEl = document.getElementById('pythonCode');
      const currentCode = codeEl ? codeEl.textContent.trim() : '';
      if (!currentCode || currentCode.startsWith('# Drag blocks')) {
        appendMessage('system', 'Add blocks before requesting code analysis.');
        return;
      }
      handleSend('Analyze this code for bugs.');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
}());
