# Troubleshooting

## The App Cannot Reach Ollama

You may see:

```text
Could not reach Ollama at http://localhost:11434
```

Fix:

```powershell
ollama serve
```

Then run the app again.

## No Models Are Installed

You may see:

```text
No Ollama models are installed.
```

Install one:

```powershell
ollama pull llama3.2
```

Then start a conversation:

```text
/new llama3.2
```

## Model Is Not Installed

You may see:

```text
Model "mistral" is not installed in Ollama.
```

Install that model:

```powershell
ollama pull mistral
```

Or choose a model from:

```text
/models
```

## `hearth` Is Not Recognized

From the project folder:

```powershell
npm run build
npm install -g .
```

Then try:

```powershell
hearth
```

## TUI Looks Broken

Try:

- Make the terminal window taller and wider.
- Use Windows Terminal, PowerShell 7, or another modern terminal.
- Re-run the app after resizing.

Minimum practical terminal size is roughly 80 columns by 24 rows.

## Output Box Cleared Unexpectedly

If you ran:

```text
/clear
```

Only the current output view was cleared. Saved conversation files are still on disk.

Use:

```text
/list
```

Then:

```text
/load conv_6794fa16-
```

## Tests Pass But Live Chat Fails

The automated tests do not require a live Ollama server.

For live chat, verify:

```powershell
ollama serve
ollama list
```

Then:

```powershell
hearth
```
