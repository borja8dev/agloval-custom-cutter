# Agloval Custom Cutter - Frontend

React 18 application with TypeScript for the custom cutting calculator UI.

## Architecture

```
src/
├── pages/           # Page components
├── components/      # Reusable UI components
├── context/         # State management
├── services/        # API communication
├── hooks/           # Custom React hooks
├── utils/           # Utilities and constants
├── styles/          # Tailwind and global styles
└── test/            # Test setup and utilities
```

## Getting Started

```bash
npm install
npm run dev
```

The app runs on port 3000 by default. See `.env.example` for configuration.

## Testing

```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run test:e2e      # E2E tests
```
