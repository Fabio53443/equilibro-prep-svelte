# Processore Liste Libri Scolastiche

Applicazione SvelteKit per elaborare liste libri scolastiche e gestire dati delle scuole. Tutto ciò che serve per costruire un progetto Svelte, basato su [`sv`](https://github.com/sveltejs/cli).

## Creazione del progetto

Se stai vedendo questo, probabilmente hai già completato questo passaggio. Congratulazioni!

```bash
# crea un nuovo progetto nella directory corrente
npx sv create

# crea un nuovo progetto in my-app
npx sv create my-app
```

## Sviluppo

Una volta creato un progetto e installate le dipendenze con `npm install` (o `pnpm install` o `yarn`), avvia un server di sviluppo:

```bash
npm run dev

# oppure avvia il server e apri l'app in una nuova scheda del browser
npm run dev -- --open
```

## Build di produzione

Per creare una versione di produzione della tua app:

```bash
npm run build
```

Puoi visualizzare l'anteprima della build di produzione con `npm run preview`.

> Per distribuire la tua app, potresti dover installare un [adapter](https://svelte.dev/docs/kit/adapters) per il tuo ambiente di destinazione.

## Funzionalità

- **Gestione Scuole**: Carica e filtra scuole dal database CSV
- **Filtri Avanzati**: Multi-selezione per regione, provincia, città e tipo di scuola
- **Elaborazione CSV**: Processa file CSV di input per generare liste libri
- **Storage In-Memory**: Elaborazione sicura senza accumulare file sul server
- **Download Sicuro**: I file elaborati scadono automaticamente dopo 2 minuti
- **UI Responsive**: Interfaccia moderna e reattiva in italiano
