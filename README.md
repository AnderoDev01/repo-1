# Resumidor Ollama Pro ✨

Resumidor Ollama Pro is an intelligent text processing application that allows users to process text using either local Ollama models or the Google Gemini API. It is highly customizable and offers a variety of features for text manipulation and analysis. try [https://www.google.com](google)

## Key Features

- **Dual Processing Modes:**
    - **Local Mode:** Utilizes Ollama for running large language models directly on your machine.
    - **API Mode:** Connects to the Google Gemini API for cloud-based processing.
- **Versatile Processing Tasks:**
    - Concise and detailed summarization.
    - Extraction of key bullet points.
    - Grammar and spelling correction.
    - Text improvement for clarity and impact.
    - Translation to various languages.
    - Simplified explanations of complex topics.
    - Execution of custom user-defined prompts.
- **Extensive Customization:**
    - Add and manage custom Ollama models.
    - Add new languages for output.
    - Personalize the application's theme color.
    - Toggle between dark and light interface modes.
- **Input and Output Control:**
    - View real-time statistics of the input text (character, word, and line counts).
    - Easily copy the processed result (raw text) to the clipboard.
    - Choose from various output formatting options:
        - None (plain text)
        - Markdown to HTML (basic rendering)
        - Clean Extra Spaces
        - Custom: Define your own find/replace rules using Regular Expressions.
- **Advanced Generation Details:**
    - Inspect the AI's internal "thinking" process (if provided by the model via `<think>` tags).
    - Review the exact prompt sent to the AI.
    - View the complete JSON response received from the AI service.
- **Configuration Management:**
    - All settings (theme, selected models, API keys, custom lists) are conveniently saved in the browser's LocalStorage.
    - Option to reset all configurations to their default state.

## How to Use

The application interface is designed to be intuitive. Here's a brief overview of the main sections:

1.  **🎨 Personalização & Tema (Personalization & Theme):**
    *   Customize the main theme color.
    *   Toggle between Dark and Light mode.
    *   Reset all application settings to their defaults.

2.  **⚙️ Configurações de Processamento (Processing Settings):**
    *   Switch between **Local Mode (Ollama)** and **API Mode (Google Gemini)**.
    *   **Local Mode:**
        *   Select from a list of available Ollama models.
        *   Add new Ollama models by specifying their name (e.g., `gemma2:2b`).
    *   **API Mode:**
        *   Enter your Google Gemini API Key (stored locally in your browser).
        *   Select the desired Gemini model.
    *   Choose the **Tipo de processamento (Processing Type)** (e.g., Summarize, Translate, Custom Prompt).
    *   Select the **Idioma de saída (Output Language)**. You can also add new languages to this list.
    *   If "Custom Prompt" is selected, a text area will appear for you to input your custom instructions, using `{{TEXTO}}` for the input text placeholder and `{{IDIOMA}}` for the output language placeholder.

3.  **📝 Texto de Entrada (Input Text):**
    *   Paste or type the text you want to process in the main text area.
    *   Below the text area, you'll see live statistics: character count, word count, and line count.
    *   Click the **🚀 Processar Texto (Process Text)** button or use the `Ctrl+Enter` shortcut to start processing.
    *   Timers for Time to First Token (TTFT), AI Thinking Time, and Total Processing Time are displayed below the button.

4.  **✨ Resultado Processado (Processed Result):**
    *   The processed text will appear here.
    *   You can select an **Output Formatter** (None, Markdown to HTML, Clean Spaces, Custom).
    *   If "Custom" formatting is chosen, you can define find/replace rules using regular expressions.
    *   Use the **📋 Copiar (Copy)** button to copy the raw, unprocessed result to your clipboard.

5.  **🔍 Detalhes da Geração (Generation Details):**
    *   This section contains collapsible panels to view:
        *   **🧠 Raciocínio Interno da IA (AI's Internal Thinking):** Shows any content wrapped in `<think>` tags from the AI's response.
        *   **📝 Prompt Enviado (Submitted Prompt):** Displays the exact prompt that was sent to the AI.
        *   **📄 Resposta Completa (JSON) (Full JSON Response):** Shows the complete JSON data received from the Ollama or Gemini API.

Simply configure your desired settings, input your text, and click "Processar Texto"!

## Local Setup

To use the **Local Mode** for text processing, you need to have Ollama installed and running on your computer.

*   **Install Ollama:** Follow the instructions on the [official Ollama website](https://ollama.com/) to download and install it for your operating system.
*   **Ensure Ollama is Running:** Before using the local processing mode in this application, make sure the Ollama service is active.
*   **Model Availability:** The application will attempt to list models available through your local Ollama instance (usually accessible at `http://localhost:11434`). You can pull models using the Ollama CLI (e.g., `ollama pull gemma2`). You can also add model names directly in the application's settings.

The application tries to auto-detect if Ollama is running on `http://localhost:11434`. If your Ollama instance is running on a different host or port, you might need to adjust the `OLLAMA_API_BASE_URL` variable in the `script.js` file or ensure appropriate network access if running the HTML file from a different origin.

## Technology Stack

*   **Frontend:** HTML, CSS (with CSS variables for dynamic theming), vanilla JavaScript (ES6+).
*   **AI Integration:**
    *   **Ollama:** For local large language model processing.
    *   **Google Gemini API:** For cloud-based AI processing.
*   **Storage:** Browser LocalStorage is used to save user configurations and preferences.
*   **No Backend Server:** This is a client-side application that interacts directly with Ollama or the Google Gemini API from the user's browser.
