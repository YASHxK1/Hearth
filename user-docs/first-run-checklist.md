# First Run Checklist

Use this checklist when trying the app on a machine for the first time.

## Setup

1. Install Node.js 20 or newer.
2. Install Ollama.
3. Open a terminal in the project folder.
4. Run:

```powershell
npm install
npm run build
```

## Ollama

5. Start Ollama if needed:

```powershell
ollama serve
```

6. Install a model:

```powershell
ollama pull llama3.2
```

7. Confirm the model exists:

```powershell
ollama list
```

## App

8. Start the app:

```powershell
npm run dev
```

Or, after global install:

```powershell
hearth
```

9. Confirm the TUI appears with:

- Output box.
- Input box.
- Status line.

10. Run:

```text
/models
```

Use Up/Down to choose a model and press Enter.

11. Start a conversation:

```text
/new llama3.2
```

12. Send a message:

```text
Give me a three-bullet explanation of how HTTP works.
```

13. Confirm the response streams inside the output box.

14. Confirm the status line shows the model and context estimate.

15. Exit:

```text
/exit
```

## Persistence Check

16. Start the app again.

17. Run:

```text
/list
```

18. Load the conversation from the picker:

```text
/list
```

19. Use Up/Down to select the conversation and press Enter.

20. Confirm the previous messages appear.

21. Exit, restart the app, and run:

```text
/new
```

22. Confirm the remembered model is used.

23. Try:

```text
/search HTTP
```
