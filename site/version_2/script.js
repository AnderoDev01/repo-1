document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    inputText: document.getElementById('inputText'),
    output: document.getElementById('output'),
    statusIndicator: document.getElementById('statusIndicator'),
    runBtn: document.getElementById('runBtn'),
    runBtnText: document.getElementById('runBtnText'),
    runBtnSpinner: document.getElementById('runBtnSpinner'),
    modelSelector: document.getElementById('modelSelector'),
    taskSelector: document.getElementById('taskSelector'),
    summaryLanguage: document.getElementById('summaryLanguage'),
    newModelName: document.getElementById('newModelName'),
    addModelBtn: document.getElementById('addModelBtn'),
    newLanguageInput: document.getElementById('newLanguageInput'),
    addLanguageBtn: document.getElementById('addLanguageBtn'),
    thinkingDisplay: document.getElementById('thinkingDisplay'),
    promptDisplay: document.getElementById('promptDisplay'),
    originalResponseDisplay: document.getElementById('originalResponseDisplay'),
    themeColorPicker: document.getElementById('themeColorPicker'),
    resetConfigBtn: document.getElementById('resetConfigBtn'),
    toggleDarkModeBtn: document.getElementById('toggleDarkMode'),
    charCount: document.getElementById('charCount'),
    wordCount: document.getElementById('wordCount'),
    lineCount: document.getElementById('lineCount'),
    copyResultBtn: document.getElementById('copyResultBtn'),
    customPromptContainer: document.getElementById('customPromptContainer'),
    customPromptText: document.getElementById('customPromptText'),
    welcomeMsg: document.getElementById('welcomeMsg'),
    ttftDisplay: document.getElementById('ttftDisplay'),
    thinkTimeDisplay: document.getElementById('thinkTimeDisplay'),
    totalTimeDisplay: document.getElementById('totalTimeDisplay'),
    outputFormatter: document.getElementById('outputFormatter'),
    customFormattingRulesContainer: document.getElementById('customFormattingRulesContainer'),
    customRulesList: document.getElementById('customRulesList'),
    addCustomRuleBtn: document.getElementById('addCustomRuleBtn'),
    toggleProcessingModeBtn: document.getElementById('toggleProcessingModeBtn'),
    localModeSettings: document.getElementById('localModeSettings'),
    apiModeSettings: document.getElementById('apiModeSettings'),
    geminiApiKey: document.getElementById('geminiApiKey'),
    geminiModelSelector: document.getElementById('geminiModelSelector'),
    thinkingHeader: document.getElementById('thinkingHeader'),
    promptHeader: document.getElementById('promptHeader'),
    originalResponseHeader: document.getElementById('originalResponseHeader')
  };

  const OLLAMA_API_BASE_URL = typeof OLLAMA_HOST !== 'undefined' ? OLLAMA_HOST.replace(/\/$/, '') : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:11434' : '');
  const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  const APP_CONFIG_KEY = 'ollamaResumidorProConfig_v3';

  let currentAbortController = null;
  let requestStartTime, firstTokenTime, processingInterval;

  const defaultConfig = {
    themeColor: '#6366f1',
    darkMode: false,
    processingMode: 'local',
    selectedModel: '',
    customModels: [],
    geminiApiKey: '',
    selectedGeminiModel: 'gemini-1.5-flash-latest',
    selectedTask: 'summarize_concise',
    selectedLanguage: 'Português',
    customLanguages: [],
    customPrompt: "Resuma o seguinte texto de forma concisa:\n\n{{TEXTO}}\n\nO resumo deve ser em {{IDIOMA}}.",
    selectedFormatter: 'none',
    customFormatRules: []
  };

  let config = JSON.parse(JSON.stringify(defaultConfig));

  function saveConfig() {
    try {
      localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn("Não foi possível salvar as configurações:", error);
      updateStatus("Erro ao salvar configurações no LocalStorage.", "error");
    }
  }

  function loadConfig() {
    try {
      const savedConfig = localStorage.getItem(APP_CONFIG_KEY);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        config = { ...JSON.parse(JSON.stringify(defaultConfig)), ...parsedConfig };
        if (!Array.isArray(config.customModels)) config.customModels = [];
        if (!Array.isArray(config.customLanguages)) config.customLanguages = [];
        if (!Array.isArray(config.customFormatRules)) config.customFormatRules = [];
      } else {
        config = JSON.parse(JSON.stringify(defaultConfig));
      }
    } catch (error) {
      console.warn("Não foi possível carregar configurações, usando padrão:", error);
      config = JSON.parse(JSON.stringify(defaultConfig));
    }
    applyUiFromConfig();
  }

  function applyUiFromConfig() {
    document.documentElement.style.setProperty('--color-primary', config.themeColor);
    document.documentElement.style.setProperty('--color-primary-dark', shadeColor(config.themeColor, -20));
    document.documentElement.style.setProperty('--color-primary-light', shadeColor(config.themeColor, 20));
    elements.themeColorPicker.value = config.themeColor;

    if (config.darkMode) {
      document.body.classList.add('dark-mode');
      elements.toggleDarkModeBtn.textContent = '☀️ Modo Claro';
    } else {
      document.body.classList.remove('dark-mode');
      elements.toggleDarkModeBtn.textContent = '🌒 Modo Escuro';
    }

    elements.taskSelector.value = config.selectedTask;
    elements.summaryLanguage.value = config.selectedLanguage;
    elements.customPromptText.value = config.customPrompt;
    elements.outputFormatter.value = config.selectedFormatter;
    elements.geminiApiKey.value = config.geminiApiKey;
    elements.geminiModelSelector.value = config.selectedGeminiModel;

    // Clear existing custom options before repopulating to avoid duplicates on re-apply
    elements.summaryLanguage.querySelectorAll('option[data-custom="true"]').forEach(opt => opt.remove());
    populateSelectWithOptions(elements.summaryLanguage, config.customLanguages, false, true);
    // Ensure selectedLanguage is still valid
    if (!Array.from(elements.summaryLanguage.options).some(o => o.value === config.selectedLanguage)) {
        if (elements.summaryLanguage.options.length > 0) {
            config.selectedLanguage = elements.summaryLanguage.options[0].value; // Default to first if saved is invalid
            elements.summaryLanguage.value = config.selectedLanguage;
        }
    }


    elements.customPromptContainer.style.display = (config.selectedTask === 'custom_prompt') ? 'block' : 'none';
    elements.customFormattingRulesContainer.style.display = (config.selectedFormatter === 'custom') ? 'block' : 'none';
    renderCustomFormatRules();

    if (config.processingMode === 'local') {
      elements.localModeSettings.style.display = 'block';
      elements.apiModeSettings.style.display = 'none';
      elements.toggleProcessingModeBtn.innerHTML = 'API Mode <span role="img" aria-label="Globo">🌐</span>';
      elements.toggleProcessingModeBtn.title = 'Alternar para Modo API (Gemini)';
      // Only fetch if models aren't loaded or placeholder exists
      const modelOptions = elements.modelSelector.options;
      if (modelOptions.length === 0 || (modelOptions.length === 1 && modelOptions[0].value === "")) {
        fetchOllamaModels();
      } else {
        // Models are loaded, ensure selection is correct
        elements.modelSelector.querySelectorAll('option[data-custom="true"]').forEach(opt => opt.remove());
        populateSelectWithOptions(elements.modelSelector, config.customModels, true, true);
        if (config.selectedModel && Array.from(modelOptions).some(o => o.value === config.selectedModel)) {
          elements.modelSelector.value = config.selectedModel;
        } else if (modelOptions.length > 0 && modelOptions[0].value !== "") {
           // If selectedModel is invalid or not set, and there are models, default to first valid
           if (!Array.from(modelOptions).some(o => o.value === config.selectedModel) && modelOptions[0].value) {
               config.selectedModel = modelOptions[0].value;
               elements.modelSelector.value = config.selectedModel;
           }
        }
      }
    } else { // api mode
      elements.localModeSettings.style.display = 'none';
      elements.apiModeSettings.style.display = 'block';
      elements.toggleProcessingModeBtn.innerHTML = 'Local Mode <span role="img" aria-label="Casa">🏠</span>';
      elements.toggleProcessingModeBtn.title = 'Alternar para Modo Local (Ollama)';
    }
  }

  function resetConfig() {
    if (confirm("Tem certeza que deseja resetar TODAS as configurações (tema, IA, formatação, API keys)? Esta ação é irreversível.")) {
      localStorage.removeItem(APP_CONFIG_KEY);
      config = JSON.parse(JSON.stringify(defaultConfig));
      elements.modelSelector.innerHTML = '<option value="">Carregando modelos...</option>'; // Reset model selector before applyUI
      applyUiFromConfig(); // This will re-populate and trigger fetchOllamaModels if in local mode
      updateStatus("Configurações resetadas para o padrão.", "success");
    }
  }

  function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = Math.round(R * (100 + percent) / 100);
    G = Math.round(G * (100 + percent) / 100);
    B = Math.round(B * (100 + percent) / 100);
    R = Math.min(255, Math.max(0, R));
    G = Math.min(255, Math.max(0, G));
    B = Math.min(255, Math.max(0, B));
    return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`;
  }

  function updateStatus(message, type = 'info', showSpinner = false) {
    elements.statusIndicator.textContent = '';
    if (showSpinner) {
      const spinner = document.createElement('span');
      spinner.className = 'loading-spinner';
      elements.statusIndicator.appendChild(spinner);
    }
    elements.statusIndicator.appendChild(document.createTextNode(` ${message}`));
    elements.statusIndicator.className = 'status-indicator show';
    ['status-processing', 'status-success', 'status-error', 'status-warning', 'status-info'].forEach(cls => elements.statusIndicator.classList.remove(cls));
    if (type) elements.statusIndicator.classList.add(`status-${type}`);

    if (type !== 'processing') {
      setTimeout(() => {
        elements.statusIndicator.classList.remove('show');
        setTimeout(() => elements.statusIndicator.className = 'status-indicator', 300);
      }, type === 'error' ? 7000 : (type === 'info' ? 3000 : 4000));
    }
  }

  function populateSelectWithOptions(selectElement, optionsArray, isModel = true, isCustom = false) {
    optionsArray.forEach(optValue => {
      if (typeof optValue !== 'string' || optValue.trim() === '') return; // Skip empty/invalid options
      if (!Array.from(selectElement.options).some(o => o.value === optValue)) {
        const option = document.createElement('option');
        option.value = optValue;
        option.textContent = optValue;
        if (isCustom) option.dataset.custom = "true";
        selectElement.appendChild(option);
      }
    });
  }

  function updateTextStats() {
    const text = elements.inputText.value;
    elements.charCount.textContent = String(text.length);
    elements.wordCount.textContent = String(text.trim() ? text.trim().split(/\s+/).length : 0);
    elements.lineCount.textContent = String(text.split('\n').length);
  }

  function startTimersAndInterval() {
    requestStartTime = performance.now();
    firstTokenTime = null;
    elements.ttftDisplay.textContent = 'TTFT: -';
    elements.thinkTimeDisplay.textContent = 'T. Raciocínio: -';
    elements.totalTimeDisplay.textContent = 'T. Total: Processando...';
    clearInterval(processingInterval);
    processingInterval = setInterval(() => {
      if (requestStartTime) {
        const elapsedTime = ((performance.now() - requestStartTime) / 1000).toFixed(2);
        elements.totalTimeDisplay.textContent = `T. Total: ${elapsedTime}s`;
      }
    }, 100);
  }

  function stopTotalTimerAndInterval() {
    clearInterval(processingInterval);
    if (requestStartTime) {
      const elapsedTime = ((performance.now() - requestStartTime) / 1000).toFixed(2);
      elements.totalTimeDisplay.textContent = `T. Total: ${elapsedTime}s`;
    } else {
      elements.totalTimeDisplay.textContent = 'T. Total: -';
    }
  }

  function recordFirstTokenTime() {
    if (!firstTokenTime && requestStartTime) {
      firstTokenTime = performance.now();
      const ttft = ((firstTokenTime - requestStartTime) / 1000).toFixed(2);
      elements.ttftDisplay.textContent = `TTFT: ${ttft}s`;
    }
  }

  function applyFormatting(text, formatterType, customRules) {
    if (typeof text !== 'string') text = String(text);
    switch (formatterType) {
      case 'markdown':
        let html = text
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/(\*\*|__)(?=\S)(.*?)(?=\S)\1/g, '<strong>$2</strong>')
          .replace(/(\*|_)(?=\S)(.*?)(?=\S)\1/g, '<em>$2</em>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/^\s*([-*+]) (.*)/gm, (match, bullet, item) => `<li>${item.trim()}</li>`);
        html = html.replace(/(<li>.*?<\/li>\s*)+/gm, (match) => `<ul>\n${match.trim()}\n</ul>`);
        html = html.replace(/\n/g, '<br>\n');
        return html;
      case 'clean_spaces':
        return text.replace(/[ \t]{2,}/g, ' ').replace(/^\s+|\s+$/gm, '').replace(/\n{3,}/g, '\n\n');
      case 'custom':
        let result = text;
        (customRules || []).forEach(rule => {
          if (rule.find) {
            try {
              const regex = new RegExp(rule.find, rule.flags || 'gim');
              result = result.replace(regex, rule.replace || '');
            } catch (e) {
              console.warn(`Regra Regex inválida: Find='${rule.find}', Flags='${rule.flags}'`, e);
              updateStatus(`Erro na regra Regex: "${rule.find}". Verifique o console.`, "warning");
            }
          }
        });
        return result;
      default:
        return text;
    }
  }

  function renderCustomFormatRules() {
    elements.customRulesList.innerHTML = '';
    config.customFormatRules.forEach((rule, index) => {
      const ruleDiv = document.createElement('div');
      ruleDiv.className = 'custom-format-rule';
      const findInput = document.createElement('input');
      findInput.type = 'text';
      findInput.placeholder = 'Localizar (Regex)';
      findInput.value = rule.find || '';
      findInput.oninput = (e) => { config.customFormatRules[index].find = e.target.value; saveConfig(); };
      const replaceInput = document.createElement('input');
      replaceInput.type = 'text';
      replaceInput.placeholder = 'Substituir por';
      replaceInput.value = rule.replace || '';
      replaceInput.oninput = (e) => { config.customFormatRules[index].replace = e.target.value; saveConfig(); };
      const flagsInput = document.createElement('input');
      flagsInput.type = 'text';
      flagsInput.placeholder = 'Flags';
      flagsInput.value = rule.flags || 'gim';
      flagsInput.style.maxWidth = '80px';
      flagsInput.oninput = (e) => { config.customFormatRules[index].flags = e.target.value.replace(/[^gimsuy]/ig, ''); saveConfig(); }; // Sanitize flags
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '🗑️';
      removeBtn.type = 'button';
      removeBtn.className = 'btn-danger btn-outline';
      removeBtn.title = "Remover Regra";
      removeBtn.onclick = () => { config.customFormatRules.splice(index, 1); saveConfig(); renderCustomFormatRules(); };
      ruleDiv.append(findInput, replaceInput, flagsInput, removeBtn);
      elements.customRulesList.appendChild(ruleDiv);
    });
  }

  async function fetchOllamaModels() {
    if (config.processingMode !== 'local' || !OLLAMA_API_BASE_URL) {
      elements.modelSelector.innerHTML = '<option value="">Modo API ou Ollama não configurado</option>';
      return;
    }
    updateStatus("Carregando modelos Ollama...", "info", true);
    elements.modelSelector.innerHTML = '<option value="">Carregando...</option>'; // Placeholder
    try {
      const response = await fetch(`${OLLAMA_API_BASE_URL}/api/tags`);
      if (!response.ok) throw new Error(`Falha ao buscar modelos: ${response.statusText} (${response.status})`);
      const data = await response.json();
      elements.modelSelector.innerHTML = ''; // Clear placeholder

      const apiModels = (data.models && data.models.length > 0) ? data.models.map(m => m.name) : [];
      populateSelectWithOptions(elements.modelSelector, apiModels, true, false);
      
      // Add custom models, ensuring they are distinct from API models in the dropdown
      const customModelsNotInApi = config.customModels.filter(cm => !apiModels.includes(cm));
      populateSelectWithOptions(elements.modelSelector, customModelsNotInApi, true, true);

      const allAvailableModels = [...apiModels, ...customModelsNotInApi];

      if (allAvailableModels.length === 0) {
        elements.modelSelector.innerHTML = '<option value="">Nenhum modelo Ollama disponível</option>';
      } else if (config.selectedModel && allAvailableModels.includes(config.selectedModel)) {
        elements.modelSelector.value = config.selectedModel;
      } else if (allAvailableModels.length > 0) {
        const oldSelected = config.selectedModel;
        config.selectedModel = allAvailableModels[0]; // Default to first available
        elements.modelSelector.value = config.selectedModel;
        saveConfig();
        if (oldSelected && oldSelected !== config.selectedModel) {
             updateStatus(`Modelo Ollama '${oldSelected}' não encontrado. Selecionado '${config.selectedModel}'.`, 'warning');
        }
      }
      updateStatus("Modelos Ollama carregados.", "success");
    } catch (error) {
      console.error("Erro ao buscar modelos Ollama:", error);
      elements.modelSelector.innerHTML = '<option value="">Falha ao carregar modelos</option>';
      updateStatus(`Erro modelos Ollama: ${error.message}. Verifique conexão e se Ollama está rodando.`, "error");
    }
  }

  function getPrompt(task, text, language, customPromptText) {
    let prompt = "";
    const targetLanguage = (language === "como no texto original" || !language) ? "o idioma original do texto" : language;
    const instructionalNote = `\n\n(Instrução para a IA: Se você usar um processo de pensamento interno para chegar à resposta, por favor, envolva esse processo estritamente com as tags <think> e </think>. O conteúdo dentro dessas tags será útil para depuração mas ocultado do usuário final. Não inclua as tags <think> na resposta final visível.)`;

    const textBlock = `\n\nTEXTO A SER PROCESSADO:\n"""\n${text}\n"""\n`;

    switch (task) {
      case 'summarize_concise': prompt = `Por favor, resuma o seguinte texto de forma concisa e objetiva, idealmente em um ou dois parágrafos. O resumo deve ser no idioma ${targetLanguage}.${textBlock}`; break;
      case 'summarize_detailed': prompt = `Por favor, crie um resumo detalhado do texto abaixo, cobrindo os pontos principais e nuances importantes. O resumo deve ser no idioma ${targetLanguage}.${textBlock}`; break;
      case 'bullet_points': prompt = `Por favor, liste os pontos chave do texto a seguir em formato de bullet points (tópicos). A lista deve ser no idioma ${targetLanguage}.${textBlock}`; break;
      case 'correct_text': prompt = `Por favor, corrija a gramática e ortografia do texto a seguir, mantendo o significado original. Apresente APENAS o texto corrigido, no idioma ${targetLanguage}.${textBlock}`; break;
      case 'improve_text': prompt = `Por favor, melhore a clareza, fluidez e impacto do texto a seguir, sem alterar seu significado central. Apresente APENAS o texto melhorado, no idioma ${targetLanguage}.${textBlock}`; break;
      case 'translate': prompt = `Por favor, traduza o seguinte texto para ${targetLanguage}. Apresente APENAS a tradução.${textBlock}`; break;
      case 'explain_simple': prompt = `Por favor, explique o conceito principal do texto a seguir de forma simples e didática, como se fosse para uma criança ou alguém sem conhecimento prévio sobre o assunto. A explicação deve ser no idioma ${targetLanguage}.${textBlock}`; break;
      case 'custom_prompt': prompt = customPromptText.replace(/{{TEXTO}}/gi, textBlock.trim()).replace(/{{IDIOMA}}/gi, targetLanguage); break; // textBlock already has newlines
      default: prompt = `Por favor, processe o texto fornecido. A saída deve ser em ${targetLanguage}.${textBlock}`;
    }
    elements.promptDisplay.textContent = prompt + instructionalNote; // Show full prompt with note
    return prompt + instructionalNote; // Send full prompt to IA
  }

  async function initiateProcessing() {
    const inputText = elements.inputText.value.trim();
    if (!inputText) {
      updateStatus("Por favor, insira um texto para processar.", "warning");
      elements.inputText.focus();
      return;
    }

    if (currentAbortController) {
      currentAbortController.abort("Nova requisição iniciada pelo usuário.");
    }
    currentAbortController = new AbortController();

    elements.runBtn.disabled = true;
    elements.runBtnText.textContent = "Processando...";
    elements.runBtnSpinner.style.display = 'inline-block';
    elements.output.innerHTML = ''; // Clear previous output
    elements.output.dataset.rawOutput = ''; // Clear previous raw output
    elements.thinkingDisplay.textContent = 'Aguardando "pensamento"...';
    elements.originalResponseDisplay.textContent = 'Aguardando resposta completa...';
    elements.promptDisplay.textContent = 'Construindo prompt...';
    startTimersAndInterval();

    if (config.processingMode === 'local') {
      await runOllama(inputText, currentAbortController.signal);
    } else {
      await runGeminiAPI(inputText, currentAbortController.signal);
    }
  }

  async function runOllama(inputText, signal) {
    if (!OLLAMA_API_BASE_URL) {
      updateStatus("URL do Ollama não configurada. Verifique as configurações.", "error");
      finalizeRequest(false, null, "Ollama"); return;
    }
    const model = config.selectedModel; // Use selectedModel from config
    if (!model) {
      updateStatus("Nenhum modelo Ollama selecionado. Verifique as configurações.", "warning");
      finalizeRequest(false, null, "Ollama"); return;
    }

    const prompt = getPrompt(config.selectedTask, inputText, config.selectedLanguage, config.customPrompt);
    updateStatus("Enviando para Ollama...", "processing", true);
    let rawGeneratedText = "";
    let fullJsonResponseForDisplay = ""; // To store the complete JSON stream for display

    try {
      const response = await fetch(`${OLLAMA_API_BASE_URL}/api/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: true }), signal
      });

      if (signal.aborted) throw new DOMException("Requisição abortada antes do início do stream.", "AbortError");
      if (!response.ok) { const errTxt = await response.text(); throw new Error(`Ollama API: ${response.status} - ${errTxt}`); }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let firstChunkReceived = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done || signal.aborted) break;
        if (!firstChunkReceived) { recordFirstTokenTime(); firstChunkReceived = true; }

        const chunk = decoder.decode(value, { stream: true });
        fullJsonResponseForDisplay += chunk;
        const jsonObjects = chunk.trim().split('\n').filter(s => s.length > 0);
        jsonObjects.forEach(jsonStr => {
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.response) rawGeneratedText += parsed.response;
            if (parsed.done && parsed.total_duration) {
                // Store the full JSON if it's the final one with context
                elements.originalResponseDisplay.textContent = JSON.stringify(parsed, null, 2);
            }
          } catch (e) { /* Ignore incomplete JSON, will be caught by next chunk or final parse */ }
        });
      }
      // Final attempt to parse the entire accumulated JSON stream for display
      if (!elements.originalResponseDisplay.textContent.includes("total_duration") && fullJsonResponseForDisplay.trim()) {
        try {
          const finalObjects = fullJsonResponseForDisplay.trim().split('\n').filter(s => s.length > 0);
          if (finalObjects.length > 0) {
            const lastJsonStr = finalObjects[finalObjects.length - 1];
            const lastObj = JSON.parse(lastJsonStr);
            // Check if it's a meaningful final object (e.g., contains 'done' or 'total_duration')
            if (lastObj.done || lastObj.total_duration || Object.keys(lastObj).length > 1) {
              elements.originalResponseDisplay.textContent = JSON.stringify(lastObj, null, 2);
            } else {
               elements.originalResponseDisplay.textContent = `Stream finalizada, mas o último objeto JSON não parece completo. Stream bruta:\n${fullJsonResponseForDisplay}`;
            }
          }
        } catch (e) {
          elements.originalResponseDisplay.textContent = `Erro ao parsear JSON final da stream Ollama. Stream bruta:\n${fullJsonResponseForDisplay}`;
          console.warn("Ollama stream final parse error:", e);
        }
      }


    } catch (error) {
      if (error.name === 'AbortError' || signal.aborted) {
        updateStatus("Processamento Ollama cancelado.", "warning");
        elements.output.textContent = "Processamento cancelado pelo usuário.";
      } else {
        console.error("Erro Ollama:", error);
        updateStatus(`Erro Ollama: ${error.message}`, "error");
        elements.output.textContent = `Ocorreu um erro com Ollama: ${error.message}`;
        elements.originalResponseDisplay.textContent = `Erro: ${error.message}\n${error.stack || ''}`;
      }
      rawGeneratedText = null; // Indicate error for finalizeRequest
    } finally {
      finalizeRequest(rawGeneratedText !== null, rawGeneratedText, "Ollama");
    }
  }

  async function runGeminiAPI(inputText, signal) {
    const apiKey = config.geminiApiKey;
    if (!apiKey) {
      updateStatus("Chave da API Google Gemini não informada. Verifique as configurações.", "warning");
      finalizeRequest(false, null, "Gemini API"); return;
    }
    const geminiModel = config.selectedGeminiModel;

    const prompt = getPrompt(config.selectedTask, inputText, config.selectedLanguage, config.customPrompt);
    updateStatus("Enviando para Gemini API...", "processing", true);
    let rawGeneratedText = "";

    try {
      const fullApiUrl = `${GEMINI_API_BASE_URL}/${geminiModel}:generateContent?key=${apiKey}`;
      const response = await fetch(fullApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal
      });

      if (signal.aborted) throw new DOMException("Requisição abortada antes da resposta.", "AbortError");
      recordFirstTokenTime(); // For non-streamed API, this is close to total API time

      if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { error: { message: `Erro ${response.status}: ${response.statusText} (Resposta não-JSON)` }};
        }
        throw new Error(`Gemini API: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      const data = await response.json();
      elements.originalResponseDisplay.textContent = JSON.stringify(data, null, 2);

      if (data.candidates && data.candidates.length > 0 &&
        data.candidates[0].content && data.candidates[0].content.parts &&
        data.candidates[0].content.parts.length > 0 &&
        typeof data.candidates[0].content.parts[0].text === 'string') {
        rawGeneratedText = data.candidates[0].content.parts[0].text;
      } else if (data.promptFeedback && data.promptFeedback.blockReason) {
        const safetyDetails = data.promptFeedback.safetyRatings?.map(r => `${r.category}: ${r.probability}`).join(', ') || 'Detalhes não fornecidos';
        throw new Error(`Conteúdo bloqueado pela Gemini API: ${data.promptFeedback.blockReason} (${safetyDetails})`);
      } else {
        rawGeneratedText = "Nenhuma resposta de texto encontrada ou formato inesperado da API Gemini.";
        console.warn("Resposta inesperada da API Gemini:", data);
      }

    } catch (error) {
      if (error.name === 'AbortError' || signal.aborted) {
        updateStatus("Processamento Gemini cancelado.", "warning");
        elements.output.textContent = "Processamento cancelado pelo usuário.";
      } else {
        console.error("Erro Gemini API:", error);
        updateStatus(`Erro Gemini API: ${error.message}`, "error");
        elements.output.textContent = `Ocorreu um erro com a API Gemini: ${error.message}`;
        elements.originalResponseDisplay.textContent = `Erro: ${error.message}\n${error.stack || ''}`;
      }
      rawGeneratedText = null;
    } finally {
      finalizeRequest(rawGeneratedText !== null, rawGeneratedText, "Gemini API");
    }
  }

  function finalizeRequest(success, rawGeneratedText, source = "IA") {
    stopTotalTimerAndInterval();
    processFinalOutput(rawGeneratedText); // Process even if rawGeneratedText is null or empty

    elements.runBtn.disabled = false;
    elements.runBtnText.textContent = "🚀 Processar Texto";
    elements.runBtnSpinner.style.display = 'none';
    if (currentAbortController && !currentAbortController.signal.aborted) {
        // Only nullify if it wasn't aborted by a new request already
        currentAbortController = null;
    }

    if (success && typeof rawGeneratedText === 'string' && rawGeneratedText.length > 0) {
      updateStatus(`${source} concluído!`, "success");
    } else if (success && (rawGeneratedText === null || (typeof rawGeneratedText === 'string' && rawGeneratedText.length === 0)) &&
               !elements.statusIndicator.classList.contains('status-error') &&
               !elements.statusIndicator.classList.contains('status-warning')) {
      updateStatus(`Nenhuma resposta de texto recebida de ${source}.`, "warning");
    }
    // Error/warning statuses related to API calls are set within runOllama/runGeminiAPI
  }

  function processFinalOutput(rawText) {
    const thinkStartTime = performance.now();
    let thinkContent = "";
    let cleanTextForOutput = (typeof rawText === 'string') ? rawText : ""; // Ensure it's a string

    const thinkRegex = /<think>(.*?)<\/think>/gis;
    const extractedThinks = [];
    let lastIndex = 0;
    let tempCleanText = "";
    let match;
    while ((match = thinkRegex.exec(cleanTextForOutput)) !== null) {
      extractedThinks.push(match[1].trim());
      tempCleanText += cleanTextForOutput.substring(lastIndex, match.index);
      lastIndex = thinkRegex.lastIndex;
    }
    tempCleanText += cleanTextForOutput.substring(lastIndex);
    cleanTextForOutput = tempCleanText.trim();

    if (extractedThinks.length > 0) {
      thinkContent = extractedThinks.join("\n\n────────────────────\n\n").trim();
    }

    const thinkEndTime = performance.now();
    const thinkDuration = ((thinkEndTime - thinkStartTime) / 1000).toFixed(2);
    elements.thinkTimeDisplay.textContent = `T. Raciocínio: ${thinkDuration}s`;
    elements.thinkingDisplay.textContent = thinkContent || 'Nenhum "pensamento" (<think>) detectado.';

    elements.output.dataset.rawOutput = cleanTextForOutput;
    const formattedOutput = applyFormatting(cleanTextForOutput, config.selectedFormatter, config.customFormatRules);

    const isHtmlOutput = /<[a-z][\s\S]*>/i.test(formattedOutput);
    if ((config.selectedFormatter === 'markdown' || (config.selectedFormatter === 'custom' && isHtmlOutput))) {
      elements.output.innerHTML = formattedOutput || "Nenhum resultado para exibir.";
    } else {
      elements.output.textContent = formattedOutput || "Nenhum resultado para exibir.";
    }
  }

  // --- Event Listeners ---
  elements.themeColorPicker.addEventListener('input', (e) => { config.themeColor = e.target.value; applyUiFromConfig(); });
  elements.themeColorPicker.addEventListener('change', saveConfig);
  elements.toggleDarkModeBtn.addEventListener('click', () => { config.darkMode = !config.darkMode; applyUiFromConfig(); saveConfig(); });
  elements.resetConfigBtn.addEventListener('click', resetConfig);

  elements.toggleProcessingModeBtn.addEventListener('click', () => {
    config.processingMode = (config.processingMode === 'local') ? 'api' : 'local';
    applyUiFromConfig();
    saveConfig();
  });

  elements.geminiApiKey.addEventListener('input', (e) => { config.geminiApiKey = e.target.value; saveConfig(); });
  elements.geminiModelSelector.addEventListener('change', (e) => { config.selectedGeminiModel = e.target.value; saveConfig(); });

  elements.addModelBtn.addEventListener('click', () => {
    const newModel = elements.newModelName.value.trim();
    if (newModel) {
      if (!config.customModels.includes(newModel) && !Array.from(elements.modelSelector.options).some(o => o.value === newModel && !o.dataset.custom)) {
        config.customModels.push(newModel);
        populateSelectWithOptions(elements.modelSelector, [newModel], true, true);
        elements.modelSelector.value = newModel; config.selectedModel = newModel;
        saveConfig(); elements.newModelName.value = '';
        updateStatus(`Modelo Ollama "${newModel}" adicionado à lista.`, "success");
      } else { updateStatus(`Modelo Ollama "${newModel}" já existe na lista ou é um modelo base.`, "warning"); }
    } else { updateStatus("Nome do modelo Ollama não pode ser vazio.", "warning"); }
  });
  elements.newModelName.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); elements.addModelBtn.click(); } });

  elements.addLanguageBtn.addEventListener('click', () => {
    const newLang = elements.newLanguageInput.value.trim();
    if (newLang) {
      if (!config.customLanguages.includes(newLang) && !Array.from(elements.summaryLanguage.options).some(o => o.value === newLang)) {
        config.customLanguages.push(newLang);
        populateSelectWithOptions(elements.summaryLanguage, [newLang], false, true);
        elements.summaryLanguage.value = newLang; config.selectedLanguage = newLang;
        saveConfig(); elements.newLanguageInput.value = '';
        updateStatus(`Idioma "${newLang}" adicionado.`, "success");
      } else { updateStatus(`Idioma "${newLang}" já existe.`, "warning"); }
    } else { updateStatus("Nome do idioma não pode ser vazio.", "warning"); }
  });
  elements.newLanguageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); elements.addLanguageBtn.click(); } });

  elements.modelSelector.addEventListener('change', (e) => { config.selectedModel = e.target.value; saveConfig(); });
  elements.taskSelector.addEventListener('change', (e) => { config.selectedTask = e.target.value; elements.customPromptContainer.style.display = (config.selectedTask === 'custom_prompt') ? 'block' : 'none'; saveConfig(); });
  elements.summaryLanguage.addEventListener('change', (e) => { config.selectedLanguage = e.target.value; saveConfig(); });
  elements.customPromptText.addEventListener('input', (e) => { config.customPrompt = e.target.value; saveConfig(); });

  elements.outputFormatter.addEventListener('change', (e) => {
    config.selectedFormatter = e.target.value;
    elements.customFormattingRulesContainer.style.display = (config.selectedFormatter === 'custom') ? 'block' : 'none';
    saveConfig();
    const rawOutput = elements.output.dataset.rawOutput;
    if (rawOutput && rawOutput !== "Seu resultado aparecerá aqui...") {
      const reFormatted = applyFormatting(rawOutput, config.selectedFormatter, config.customFormatRules);
      const isHtmlOutput = /<[a-z][\s\S]*>/i.test(reFormatted);
      if ((config.selectedFormatter === 'markdown' || (config.selectedFormatter === 'custom' && isHtmlOutput))) {
        elements.output.innerHTML = reFormatted;
      } else {
        elements.output.textContent = reFormatted;
      }
    }
  });
  elements.addCustomRuleBtn.addEventListener('click', () => { config.customFormatRules.push({ find: '', replace: '', flags: 'gim' }); saveConfig(); renderCustomFormatRules(); });

  elements.runBtn.addEventListener('click', initiateProcessing);
  elements.inputText.addEventListener('keydown', (e) => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); initiateProcessing(); } });
  elements.inputText.addEventListener('input', updateTextStats);

  elements.copyResultBtn.addEventListener('click', () => {
    const rawOutputToCopy = elements.output.dataset.rawOutput;
    if (rawOutputToCopy && rawOutputToCopy !== "Seu resultado aparecerá aqui...") {
      navigator.clipboard.writeText(rawOutputToCopy)
        .then(() => updateStatus("Texto original (sem formatação extra) copiado!", "success"))
        .catch(err => { console.error("Erro ao copiar:", err); updateStatus("Falha ao copiar. Verifique permissões do navegador.", "error"); });
    } else { updateStatus("Nada para copiar.", "warning"); }
  });

  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      const isOpen = header.classList.toggle('open');
      header.setAttribute('aria-expanded', String(isOpen));
      content.style.display = isOpen ? 'block' : 'none';
    });
    header.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); } });
  });

  // --- Inicialização ---
  updateTextStats();
  loadConfig(); // Carrega e aplica a UI (inclui fetch de modelos Ollama se modo local)

  setTimeout(() => {
    if (elements.welcomeMsg.style.display !== 'none') {
      elements.welcomeMsg.style.opacity = '0';
      setTimeout(() => { elements.welcomeMsg.style.display = 'none'; }, 500);
    }
  }, 8000);
  elements.inputText.addEventListener('focus', () => {
    if (elements.welcomeMsg.style.display !== 'none') {
      elements.welcomeMsg.style.opacity = '0';
      setTimeout(() => { elements.welcomeMsg.style.display = 'none'; }, 500);
    }
  }, { once: true });
});
