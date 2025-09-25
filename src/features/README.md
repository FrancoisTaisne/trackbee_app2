# Features Architecture

## 📁 Structure des Features par Domaine

TrackBee App v2 utilise une architecture feature-based où chaque domaine métier est organisé de manière autonome avec ses propres composants, hooks, et logique.

### 🏗️ Template Feature

```
src/features/[feature-name]/
├── components/          # Composants spécifiques à la feature
│   ├── [FeatureName]List.tsx
│   ├── [FeatureName]Card.tsx
│   ├── [FeatureName]Form.tsx
│   └── index.ts
├── hooks/              # Hooks métier spécifiques
│   ├── use[FeatureName].ts
│   ├── use[FeatureName]List.ts
│   └── index.ts
├── pages/              # Pages de la feature
│   ├── [FeatureName]Page.tsx
│   ├── [FeatureName]DetailPage.tsx
│   └── index.ts
├── types/              # Types spécifiques (si non dans core)
│   └── index.ts
└── index.ts           # Export centralisé
```

### 🎯 Features Identifiées

#### **1. Auth Feature**
- **Responsabilité** : Authentification, session utilisateur, guards
- **Composants** : LoginModal, LogoutButton, AuthGuard
- **Pages** : LoginPage, ProfilePage
- **Hooks** : useAuth, useSession

#### **2. Device Feature**
- **Responsabilité** : Gestion devices IoT, connexions BLE, scan
- **Composants** : DeviceCard, BleStatusPill, ScanBleModal, DeviceForm
- **Pages** : DeviceListPage, DeviceDetailPage
- **Hooks** : useDevice, useDeviceList, useBleConnection, useBleScan

#### **3. Site Feature**
- **Responsabilité** : Gestion sites géographiques, cartographie
- **Composants** : SiteCard, SiteForm, MapPicker, PositionDisplay
- **Pages** : SiteListPage, SiteDetailPage, SiteCreatePage
- **Hooks** : useSite, useSiteList, useMapPosition

#### **4. Campaign Feature**
- **Responsabilité** : Campagnes GNSS (STATIC/MULTIPLE/KINEMATIC)
- **Composants** : CampaignCard, CampaignForm, CampaignTypeSelector, SchedulePicker
- **Pages** : CampaignListPage, CampaignDetailPage, CampaignCreatePage
- **Hooks** : useCampaign, useCampaignList, useCampaignSchedule

#### **5. Transfer Feature**
- **Responsabilité** : Transferts de fichiers BLE/WiFi, queue offline
- **Composants** : TransferButton, TransferProgress, QueueIndicator, MethodSelector
- **Pages** : TransferHistoryPage
- **Hooks** : useTransfer, useTransferQueue, useUploadProgress

#### **6. Processing Feature**
- **Responsabilité** : Post-traitement GNSS, résultats, métriques
- **Composants** : ProcessingCard, ResultDisplay, MetricsChart, StatusIndicator
- **Pages** : ProcessingListPage, ResultDetailPage
- **Hooks** : useProcessing, useProcessingList, useProcessingResults

### 🔗 Inter-Feature Communication

#### **Via Event Bus**
```typescript
// Feature A émet un événement
eventBus.emit('device:connected', { machineId, deviceId })

// Feature B écoute l'événement
eventBus.on('device:connected', handleDeviceConnected)
```

#### **Via Store Global**
```typescript
// Store partagé pour états cross-feature
const useGlobalStore = create((set) => ({
  activeDevice: null,
  currentSite: null,
  setActiveDevice: (device) => set({ activeDevice: device }),
  setCurrentSite: (site) => set({ currentSite: site })
}))
```

#### **Via Props & Context**
```typescript
// Context feature-specific
const DeviceContext = createContext<DeviceContextValue>()

// Props drilling pour communication parent-enfant
<DeviceDetail
  device={device}
  onStatusChange={handleStatusChange}
  onDownload={handleDownload}
/>
```

### 📱 Mobile-First Design Patterns

#### **Navigation Pattern**
- **Bottom Navigation** : MobileNav pour features principales
- **Floating Action Button** : Actions rapides (scan, create)
- **Swipe Gestures** : Navigation entre détails

#### **Layout Pattern**
```typescript
<AppLayout title="Devices">
  <PageHeader
    title="Mes Devices"
    actions={<ScanButton />}
  />
  <DeviceList />
</AppLayout>
```

#### **State Management Pattern**
```typescript
// Query pour server state
const { data: devices, isLoading } = useDevicesQuery()

// Zustand pour client state
const { selectedDevice, setSelectedDevice } = useDeviceStore()

// Local state pour UI
const [isModalOpen, setIsModalOpen] = useState(false)
```

### 🎨 Design System Integration

#### **Composants Partagés**
```typescript
import {
  Card, Button, Input, Modal, Badge,
  AppLayout, PageHeader
} from '@/shared/ui/components'
```

#### **Variants Métier**
```typescript
// Device-specific variants
<Badge variant="ble-connected" />
<StatusCard status="processing" />
<MetricCard type="gnss-accuracy" />
```

#### **Thème Cohérent**
```typescript
// Couleurs TrackBee
className="bg-trackbee-500 text-white"
className="border-trackbee-200 hover:bg-trackbee-50"
```

### 🚀 Lazy Loading Strategy

#### **Feature-Level Code Splitting**
```typescript
const DeviceFeature = lazy(() => import('@/features/device'))
const SiteFeature = lazy(() => import('@/features/site'))
const CampaignFeature = lazy(() => import('@/features/campaign'))
```

#### **Route-Based Splitting**
```typescript
<Route path="/devices/*" element={
  <Suspense fallback={<DeviceLoadingSkeleton />}>
    <DeviceFeature />
  </Suspense>
} />
```

### 🔧 Development Guidelines

#### **Naming Conventions**
- **Features** : kebab-case (`device`, `site`, `campaign`)
- **Components** : PascalCase (`DeviceCard`, `SiteForm`)
- **Hooks** : camelCase avec prefix `use` (`useDevice`, `useSiteList`)
- **Types** : PascalCase avec suffix (`DeviceProps`, `SiteFormData`)

#### **File Organization**
- **1 composant = 1 fichier** avec même nom
- **Index files** pour exports centralisés
- **Co-location** des types, tests, stories avec composants

#### **Import Strategy**
```typescript
// Feature-level imports
import { DeviceCard, DeviceForm } from '@/features/device'

// Shared components
import { Button, Card } from '@/shared/ui/components'

// Core utilities
import { logger, eventBus } from '@/core'
```

Cette architecture garantit une séparation claire des responsabilités, une maintenabilité élevée, et une excellente DX pour le développement des features TrackBee.