# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TrackBee App2 is a React + TypeScript mobile application for IoT GPS device management. It's built with Vite, uses Capacitor for native mobile features, and implements an event-driven architecture for handling BLE/WiFi device communication and file transfers.

## Commands

### Development
- `npm run dev` - Start development server (host 0.0.0.0:5180)
- `npm run build` - Production build (TypeScript check + Vite build)
- `npm run type-check` - TypeScript type checking only
- `npm run lint` - ESLint with TypeScript rules

### Testing
- `npm test` - Run Vitest unit tests
- `npm run test:ui` - Vitest UI mode
- `npm run test:coverage` - Generate coverage report

### Mobile (Capacitor)
- `npm run cap:sync` - Sync web assets to native platforms
- `npm run cap:open:android` - Open Android Studio
- `npm run cap:run:android` - Build and run on Android

## Architecture Overview

### Core Structure
The project follows a **feature-based architecture** with strict separation of concerns:

```
src/
├── core/           # Core infrastructure layer
│   ├── database/   # Dexie IndexedDB repositories
│   ├── orchestrator/ # Event Bus & Transfer Orchestrator
│   ├── services/   # BLE, HTTP, Storage managers
│   ├── state/      # TanStack Query + Zustand stores
│   ├── types/      # TypeScript definitions
│   └── utils/      # Logger, time, validation utilities
├── features/       # Business domain features
│   ├── auth/       # Authentication & user session
│   ├── device/     # IoT device management (BLE)
│   ├── site/       # Geographic sites & mapping
│   ├── campaign/   # GNSS campaigns (STATIC/MULTIPLE)
│   ├── transfer/   # File transfers (BLE→WiFi→Upload)
│   └── processing/ # Post-processing results
└── shared/         # Shared UI components & utilities
    └── ui/         # Design system components
```

### Key Technologies
- **React 18.3** + **TypeScript 5.6** (strict mode enabled)
- **TanStack Query v5** for server state management
- **Zustand** for client state management
- **Dexie v4** for offline IndexedDB database
- **Capacitor 7.4** for native mobile features
- **Tailwind CSS** with custom TrackBee design system

### Event-Driven Architecture
The app uses a central **EventBus** (`src/core/orchestrator/EventBus.ts`) for decoupled communication between services and UI components. Key event types defined in `src/core/types/transport.ts`.

### State Management Pattern
- **Server State**: TanStack Query for API calls, caching, background refetch
- **Client State**: Zustand stores per domain (auth, device, transfer, ui)
- **Local State**: React useState/useReducer for component-specific UI state

### BLE Communication
ESP32-C6 devices use **protocol A100** for GNSS file transfers. The `BleManager` (`src/core/services/ble/BleManager.ts`) handles:
- Device scanning and connection management
- File metadata discovery and transfer initiation
- Chunked data transfer with progress tracking
- Error handling and automatic reconnection

### TypeScript Configuration
- **Strict mode enabled** with `noUncheckedIndexedAccess`
- **Path mapping**: `@/*` resolves to `src/*` with feature-specific aliases
- **Bundler module resolution** for Vite compatibility

## Development Guidelines

### Adding New Features
1. Create feature directory in `src/features/[feature-name]/`
2. Follow the standard structure: `components/`, `hooks/`, `pages/`, `types/`
3. Export from feature's `index.ts` for clean imports
4. Use EventBus for cross-feature communication

### Type Safety
- All types are defined in `src/core/types/` with Zod validation schemas
- Use strict TypeScript - prefer explicit types over `any`
- Validate external data (API responses, BLE messages) with Zod

### State Management
- Use TanStack Query for server data (queries, mutations, caching)
- Use Zustand for app-wide client state
- Keep UI state local when possible

### Error Handling
- Use `src/core/types/errors.ts` AppError types for structured errors
- All async operations should use proper error boundaries
- Log errors through the structured logger (`src/core/utils/logger.ts`)

### Mobile Considerations
- Design mobile-first with responsive breakpoints
- Use Capacitor plugins for native features (BLE, filesystem, preferences)
- Handle offline scenarios with service workers and local database

## Important Notes

- The codebase is currently in **stabilization phase** with ~698 TypeScript errors being addressed
- Core infrastructure (60 errors) has been largely stabilized
- Focus on features layer (~400 errors) for business logic implementation
- Never commit without running `npm run type-check` and `npm run lint`
- Test on physical devices for BLE functionality - web simulator has limitations

## Project Ecosystem Locations

### Related Repositories
- **TrackBee App (Current)**: `C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\2.Front\trackbee_app2`
- **TrackBee IoT (ESP32-C6)**: `C:\Users\fanjo\workspace\trackbee_v6` or latest version `trackbee_v{number}`
- **TrackBee Backend (Node.js)**: `C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\3.Back\trackbee_back`
- **TrackBee Python (RTKLIB)**: `C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\3.Back\trackbee_python`

### System Overview
TrackBee is a complete IoT GNSS positioning ecosystem:
- **ESP32-C6 + simpleRTK2B** devices for autonomous GNSS data collection
- **React/Capacitor mobile app** for device management and data transfer (BLE/WiFi)
- **Node.js backend** for user management, data processing, and orchestration
- **Python/RTKLIB** container for precise GNSS post-processing calculations

### Key Business Scenarios
1. **STATIC_UNIQUE**: Single immediate/scheduled GNSS recording session
2. **STATIC_MULTIPLE**: Multiple scheduled recordings over time period
3. **STATIC_ROVERBASE_MULTIPLE**: Network of devices with base/rover setup (future)