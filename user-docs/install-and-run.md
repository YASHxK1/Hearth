# Install And Run

This guide assumes you are running the app from the project folder.

## Requirements

You need:

- Node.js 20 or newer
- npm
- Ollama installed
- At least one Ollama model installed

Check Node:

```powershell
node --version
```

Check npm:

```powershell
npm --version
```

Check Ollama:

```powershell
ollama --version
```

## Install Dependencies

From the project folder:

```powershell
npm install
```

## Build The App

```powershell
npm run build
```

This creates the compiled CLI in `dist/`.

## Run In Development Mode

For everyday local development/testing:

```powershell
npm run dev
```

This starts Ollama if needed, creates a new chat, and opens the interactive TUI directly from the TypeScript source.

## Install As A Global Command

From the project folder:

```powershell
npm install -g .
```

Then start the app from anywhere:

```powershell
hearth
```

`hearth` starts Ollama if needed and creates a new chat automatically.

To load the most recently updated saved chat:

```powershell
hearth --continue
```

To load a specific saved chat by ID, short ID, or title:

```powershell
hearth --resume <id-or-title>
```

## Install A Model

For example:

```powershell
ollama pull llama3.2
```

List installed models:

```powershell
ollama list
```

Inside the app, you can also run:

```text
/models
```

Start another chat inside the app:

```text
/new
```
