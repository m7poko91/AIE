# LightCounter

A practical, browser-based lighting fixture counter for electrical estimators. Speak or type a natural count such as “20 LED troffers in the east office” and LightCounter turns it into an editable, categorized fixture entry.

## Features

- Browser speech recognition with push-to-talk and continuous modes
- Automatic quantity, fixture type, technology, location, and notes parsing
- Multiple job sites with locally persisted counts
- Editable fixture table and live totals by type and location
- CSV and formatted Excel export
- Responsive interface for phones, tablets, and desktops

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Chrome or Edge is recommended for browser speech recognition. Typed fixture entry works in all modern browsers.

## Quality checks

```bash
npm test
npm run lint
npm run build
```

All job data is stored in the browser's local storage. No account or server is required.
