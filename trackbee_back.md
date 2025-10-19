# 🌐 TrackBee Backend - Node.js API Server

## 📋 Vue d'ensemble

TrackBee Backend est un serveur API Node.js professionnel pour l'orchestration d'un écosystème IoT GNSS complet. Il gère l'authentification, les métadonnées des équipements, la réception des fichiers d'observation GNSS, l'orchestration du post-processing via Python/RTKLIB, et offre un **système intelligent de décision des modes de mission** (Smart Backend) qui analyse le contexte complet (base RTK disponible, canaux de diffusion, connectivité 4G, position) pour recommander les modes optimaux à l'utilisateur.

**Status**: ✅ **OPÉRATIONNEL** - OpenAPI découverte, JWT, intégration frontend validée, Smart Mission Modes actif

### Stack Technique
- **Runtime**: Node.js 18+ avec modules ES6
- **Framework**: Express.js + middleware professionnels
- **Database**: Sequelize ORM + PostgreSQL/MySQL
- **Authentication**: JWT + Refresh tokens + bcrypt
- **API**: REST + OpenAPI 3.0 auto-discovery
- **Processing**: Python subprocess orchestration
- **Files**: Multer + validation + cloud storage

---

## 🏗️ Architecture Backend

### Structure Projet
```
trackbee_back2/
├── src/
│   ├── controllers/           # Route handlers business logic
│   │   ├── auth.controller.js    # JWT authentication
│   │   ├── machine.controller.js # IoT devices CRUD
│   │   ├── site.controller.js    # Geographic sites
│   │   ├── campaign.controller.js # GNSS campaigns
│   │   ├── upload.controller.js  # File upload + processing
│   │   └── processing.controller.js # Results + status
│   ├── middleware/            # Express middleware
│   │   ├── authJwt.js            # Token verification
│   │   ├── verifySignUp.js       # User validation
│   │   ├── uploadFiles.js        # Multer configuration
│   │   └── cors.js               # CORS policy
│   ├── models/                # Sequelize models
│   │   ├── user.model.js         # Users + roles
│   │   ├── machine.model.js      # IoT devices
│   │   ├── site.model.js         # Geographic locations
│   │   ├── campaign.model.js     # GNSS measurement campaigns
│   │   ├── installation.model.js # Physical installations
│   │   ├── calculation.model.js  # Processing results
│   │   └── index.js              # Associations + sync
│   ├── routes/                # API endpoints
│   │   ├── auth.routes.js        # Authentication routes
│   │   ├── machine.routes.js     # Devices API
│   │   ├── site.routes.js        # Sites API
│   │   ├── upload.routes.js      # File upload API
│   │   └── openapi.routes.js     # API discovery
│   ├── config/                # Configuration
│   │   ├── db.config.js          # Database connection
│   │   ├── auth.config.js        # JWT secrets
│   │   └── app.config.js         # App settings
│   └── utils/                 # Utilities
│       ├── logger.js             # Structured logging
│       ├── validation.js         # Input validation
│       └── processing.js         # Python orchestration
├── uploads/                   # Temporary file storage
├── processing/               # Python RTKLIB integration
│   ├── rtklib_processor.py      # Main processing script
│   └── templates/               # Configuration templates
└── docs/                     # OpenAPI documentation
    └── openapi.yaml             # API specification
```

### Design Patterns Utilisés
- **MVC Architecture**: Controllers → Services → Models
- **Repository Pattern**: Data access abstraction
- **Factory Pattern**: Model associations et sync
- **Strategy Pattern**: Multiple processing algorithms
- **Observer Pattern**: Processing status callbacks

---

## 🔐 Système d'Authentification

### JWT Token Management
```javascript
// auth.controller.js - Login endpoint
exports.signin = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { email: req.body.email },
      include: [
        { model: Role, as: 'roles' },
        { model: Machine, as: 'machines' },
        { model: Site, as: 'sites' }
      ]
    })

    // Password validation
    const isValid = bcryptjs.compareSync(req.body.password, user.password)
    if (!isValid) {
      return res.status(401).send({ message: "Invalid Password!" })
    }

    // JWT token generation
    const token = jwt.sign(
      { id: user.id, email: user.email },
      config.secret,
      { expiresIn: config.jwtExpiration }
    )

    // Refresh token
    const refreshToken = await RefreshToken.createToken(user)

    // Response format compatible frontend
    return res.status(200).send({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: mapBackendRoleToFrontend(user.roles[0].name)
      },
      expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      refreshToken: refreshToken.token,
      // Données hydratation pour frontend
      machines: user.machines,
      sites: user.sites
    })
  } catch (error) {
    res.status(500).send({ message: error.message })
  }
}
```

### Système de Rôles
```javascript
// User roles hierarchy
const ROLES = {
  ROLE_USER: {
    permissions: ['read:own', 'create:campaigns', 'upload:files']
  },
  ROLE_MODERATOR: {
    permissions: ['read:all', 'create:sites', 'manage:campaigns']
  },
  ROLE_ADMIN: {
    permissions: ['read:all', 'write:all', 'delete:all', 'manage:users']
  },
  ROLE_MACHINE: {
    permissions: ['upload:files', 'read:campaigns']  // Pour devices IoT
  }
}

// Middleware verification
const verifyRole = (requiredRole) => {
  return (req, res, next) => {
    User.findByPk(req.userId, {
      include: [{ model: Role, as: 'roles' }]
    }).then(user => {
      if (user.roles.find(role => role.name === requiredRole)) {
        next()
      } else {
        res.status(403).send({ message: "Insufficient permissions" })
      }
    })
  }
}
```

### Token Refresh Mechanism
```javascript
// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  const { refreshToken: requestToken } = req.body

  if (!requestToken) {
    return res.status(403).json({ message: "Refresh Token is required!" })
  }

  try {
    const refreshToken = await RefreshToken.findOne({
      where: { token: requestToken }
    })

    if (!refreshToken || RefreshToken.verifyExpiration(refreshToken)) {
      return res.status(403).json({ message: "Refresh token expired" })
    }

    const user = await refreshToken.getUser()
    const newAccessToken = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: config.jwtExpiration,
    })

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: refreshToken.token,
    })
  } catch (err) {
    return res.status(500).send({ message: err.message })
  }
}
```

---

## 📊 Modèles de Données et Base de Données

### Modèle Principal: Machines (IoT Devices)
```javascript
// models/machine.model.js
const Machine = sequelize.define('machine', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  macD: {
    type: Sequelize.STRING(17),  // MAC address format
    unique: true,
    allowNull: false,
    validate: {
      is: /^([0-9A-Fa-f]{2}[:]){5}([0-9A-Fa-f]{2})$/ // MAC format validation
    }
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  status: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  },
  lastSeen: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW
  },
  firmwareVersion: {
    type: Sequelize.STRING,
    defaultValue: 'v6.0'
  },
  batteryLevel: {
    type: Sequelize.FLOAT,
    validate: { min: 0, max: 100 }
  }
})

// Associations
Machine.belongsTo(User, { foreignKey: 'userId', as: 'owner' })
Machine.belongsTo(Site, { foreignKey: 'siteId', as: 'site' })
Machine.hasMany(Campaign, { foreignKey: 'machineId', as: 'campaigns' })
```

### Modèle Sites Géographiques
```javascript
// models/site.model.js
const Site = sequelize.define('site', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  latitude: {
    type: Sequelize.DECIMAL(10, 8),
    allowNull: false,
    validate: { min: -90, max: 90 }
  },
  longitude: {
    type: Sequelize.DECIMAL(11, 8),
    allowNull: false,
    validate: { min: -180, max: 180 }
  },
  altitude: {
    type: Sequelize.FLOAT,
    defaultValue: 0
  },
  address: {
    type: Sequelize.TEXT,
    allowNull: true
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: true
  },
  type: {
    type: Sequelize.ENUM,
    values: ['REFERENCE', 'MEASUREMENT', 'TEMPORARY'],
    defaultValue: 'MEASUREMENT'
  }
})

// Site sharing system
Site.belongsToMany(User, {
  through: 'SiteSharing',
  as: 'sharedUsers',
  foreignKey: 'siteId'
})
```

### Modèle Campagnes GNSS
```javascript
// models/campaign.model.js
const Campaign = sequelize.define('campaign', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  type: {
    type: Sequelize.ENUM,
    values: ['STATIC_UNIQUE', 'STATIC_MULTIPLE', 'KINEMATIC'],
    allowNull: false
  },
  duration_s: {
    type: Sequelize.INTEGER,
    allowNull: false,
    validate: { min: 60, max: 86400 } // 1min à 24h
  },
  scheduledAt: {
    type: Sequelize.DATE,
    allowNull: true
  },
  rrule: {
    type: Sequelize.STRING,  // RFC5545 recurrence rule
    allowNull: true
  },
  status: {
    type: Sequelize.ENUM,
    values: ['PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED'],
    defaultValue: 'PENDING'
  },
  settings: {
    type: Sequelize.JSON,  // Configuration JSON flexible
    defaultValue: {
      rtk_required: true,
      min_satellites: 12,
      elevation_mask: 15
    }
  }
})

// Relations
Campaign.belongsTo(User, { foreignKey: 'userId', as: 'creator' })
Campaign.belongsTo(Site, { foreignKey: 'siteId', as: 'site' })
Campaign.belongsTo(Machine, { foreignKey: 'machineId', as: 'machine' })
Campaign.hasMany(Calculation, { foreignKey: 'campaignId', as: 'calculations' })
```

### 🔄 Synchronisation IoT des Campagnes

#### Architecture de Synchronisation
Le système de synchronisation des campagnes permet de gérer le cycle de vie complet d'une mission GNSS entre l'application mobile, le backend et le device IoT.

**Problématique** : Les campagnes créées depuis l'application mobile doivent être synchronisées avec le device IoT via BLE. Si la connexion BLE ne se fait jamais, le backend doit détecter et alerter sur ces missions "orphelines".

**Solution** : Tracking à 3 niveaux avec détection automatique des échecs de synchronisation.

#### États de Synchronisation IoT
```javascript
// Nouveaux champs dans survey_campaign.model.js
{
  // État de synchronisation avec le device IoT
  iot_sync_status: {
    type: DataTypes.ENUM('not_sent', 'pending', 'synced', 'failed', 'timeout'),
    allowNull: false,
    defaultValue: 'not_sent',
    comment: 'Statut de synchronisation avec le device IoT'
  },
  iot_synced_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date de synchronisation effective avec l\'IoT'
  },
  iot_confirmation: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Message de confirmation du device IoT'
  },
  iot_error: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Message d\'erreur de synchronisation IoT'
  },
  iot_sync_attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Nombre de tentatives de synchronisation'
  },
  last_iot_sync_attempt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date de la dernière tentative de synchronisation'
  },
  app_local_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID local de l\'application mobile (pour traçabilité)'
  },
  app_created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date de création dans l\'application mobile'
  }
}
```

#### Endpoints de Synchronisation IoT

**1. Mise à jour du statut de synchronisation**
```http
PATCH /api/campaign/:id/iot-sync-status
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "iotSyncStatus": "synced",
  "iotSyncedAt": "2025-10-17T14:30:00Z",
  "iotConfirmation": "Campaign #123 registered successfully"
}
```

**Réponse** :
```json
{
  "ok": true,
  "campaign": {
    "id": 123,
    "iot_sync_status": "synced",
    "iot_synced_at": "2025-10-17T14:30:00Z",
    "iot_sync_attempts": 1
  }
}
```

**2. Récupérer les campagnes en attente de synchronisation**
```http
GET /api/campaign/pending-iot-sync?machineId=5&siteId=10
Authorization: Bearer <jwt_token>
```

**Réponse** :
```json
{
  "ok": true,
  "items": [
    {
      "id": 125,
      "seriesRef": "S-2025-SITE10-M5-001",
      "machineId": 5,
      "iot_sync_status": "pending",
      "iot_sync_attempts": 3,
      "last_iot_sync_attempt": "2025-10-17T14:25:00Z",
      "iot_error": "BLE connection timeout",
      "createdAt": "2025-10-17T10:00:00Z"
    }
  ],
  "count": 1
}
```

**3. Incrémenter le compteur de tentatives**
```http
POST /api/campaign/:id/increment-sync-attempts
Authorization: Bearer <jwt_token>
```

#### Flux de Synchronisation Complet

```
1. Création dans l'App (hors ligne)
   ├─> App crée campagne localement (draft)
   ├─> App → Backend: POST /api/campaign (obtenir ID)
   └─> Backend crée avec iot_sync_status='not_sent'

2. Synchronisation avec IoT (quand BLE connecté)
   ├─> App détecte connexion BLE
   ├─> App → IoT: Envoie campagne via BLE
   ├─> IoT → App: Confirmation
   ├─> App → Backend: PATCH /campaign/:id/iot-sync-status
   │   └─> { iotSyncStatus: 'synced', iotSyncedAt, iotConfirmation }
   └─> Backend met à jour iot_sync_status='synced'

3. Détection d'échec (si jamais connecté)
   ├─> Backend job: Scan campagnes avec iot_sync_status IN ('not_sent', 'pending')
   ├─> Backend détecte: createdAt > 24h && iot_sync_status != 'synced'
   ├─> Backend met à jour: iot_sync_status='timeout'
   └─> Backend → Notification utilisateur: "Device never connected"

4. Retry automatique (App)
   ├─> App queue de synchronisation
   ├─> Tentative 1 (t=0): échec → Backend PATCH (attempts=1)
   ├─> Tentative 2 (t=2s): échec → Backend PATCH (attempts=2)
   ├─> Tentative 3 (t=4s): échec → Backend PATCH (attempts=3)
   ├─> Tentative 5 (t=16s): échec définitif
   └─> App → Backend: PATCH { iotSyncStatus: 'failed', iotError }
```

#### Index de Performance
```sql
-- Index pour requêtes de monitoring
CREATE INDEX idx_campaign_iot_sync
  ON survey_campaign(machineId, iot_sync_status, createdAt);

-- Index partiel pour campagnes en attente
CREATE INDEX idx_campaign_pending_sync
  ON survey_campaign(iot_sync_status, createdAt)
  WHERE iot_sync_status IN ('not_sent', 'pending', 'failed');
```

#### Job de Monitoring (Backend)
```javascript
// Détection des campagnes non synchronisées (à implémenter)
async function detectStaleCampaigns() {
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24h

  const staleCampaigns = await SurveyCampaign.findAll({
    where: {
      iot_sync_status: ['not_sent', 'pending', 'failed'],
      createdAt: { [Op.lt]: threshold }
    }
  })

  for (const campaign of staleCampaigns) {
    await campaign.update({
      iot_sync_status: 'timeout',
      iot_error: 'Device never connected within 24h'
    })

    // Notification utilisateur
    await notificationService.send({
      userId: campaign.userId,
      type: 'campaign_sync_timeout',
      campaignId: campaign.id
    })
  }
}
```

### 🧠 Système Intelligent de Modes de Mission

#### Architecture Smart Backend

**Problématique** : L'application frontend ne devrait pas décider seule quels modes de mission sont disponibles. Cette décision dépend de facteurs complexes que seul le backend peut analyser :
- Y a-t-il une base RTK active sur le site ?
- Est-ce le premier IoT installé sur ce site ?
- La machine a-t-elle une connexion 4G ?
- Une position précise a-t-elle été fournie ?
- Quels canaux de diffusion sont disponibles (Zigbee, 4G, UHF) ?

**Solution** : Smart Backend - Le backend analyse le contexte complet et retourne uniquement les modes de mission valides avec recommandations intelligentes.

#### Nomenclature des Modes de Mission (v2.0)

**IMPORTANT**: Depuis la version 2.0 (2025-10-18), une nouvelle nomenclature systématique est en place pour clarifier les modes de mission.

**Modes disponibles:**

1. **Post-Processing (PPK)**
   - `static_unique_ppk` - Observation ponctuelle unique en post-processing
   - `static_recurrent_ppk` - Observations répétées en post-processing

2. **RTK Temps Réel - Base Locale**
   - `static_unique_rtk_base` - Point fixe unique avec corrections RTK (base locale)
   - `static_recurrent_rtk_base` - Points fixes récurrents avec corrections RTK (base locale)
   - `rover` - Mode cinématique/mobile (base locale)

3. **RTK Temps Réel - NTRIP**
   - `static_unique_rtk_ntrip` - Point fixe unique avec corrections NTRIP
   - `static_recurrent_rtk_ntrip` - Points fixes récurrents avec corrections NTRIP
   - `rover` - Mode cinématique/mobile (NTRIP)

4. **Mode Base**
   - `base` - Station de base diffusant corrections RTK

**Migration v1 → v2:**
- `static_unique` → `static_unique_ppk`
- `static_recurrent` → `static_recurrent_ppk`
- `rtk_static` → `static_unique_rtk_base` ou `static_unique_rtk_ntrip` (selon source)
- `rtk_kinematic` → `rover`
- `rtk_stop_and_go` → `static_recurrent_rtk_base` ou `static_recurrent_rtk_ntrip`

**Documentation complète:** Voir `MISSION_MODES_NOMENCLATURE.md`

#### Modèles de Base RTK

Les nouveaux modèles gèrent la configuration et le tracking des bases RTK :

```javascript
// models/installationBaseProfile.model.js
const InstallationBaseProfile = sequelize.define('installationBaseProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  installationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'installation', key: 'id' }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nom du profil de base (ex: "Base Site Chantier A")'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Profil actuellement actif'
  },
  baseConfiguration: {
    type: DataTypes.JSON,
    comment: 'Configuration position et paramètres de base'
  }
})

// models/installationBaseChannel.model.js
const InstallationBaseChannel = sequelize.define('installationBaseChannel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  baseProfileId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'installationBaseProfile', key: 'id' }
  },
  type: {
    type: DataTypes.ENUM('zigbee', 'cellular', 'uhf', 'ethernet', 'wifi'),
    allowNull: false,
    comment: 'Type de canal de diffusion'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'error'),
    defaultValue: 'active'
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Canal principal pour diffusion RTK'
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    comment: 'Priorité (1=haute, 100=basse)'
  }
})

// models/installationBaseChannelConfig.model.js
const InstallationBaseChannelConfig = sequelize.define('installationBaseChannelConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  channelId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'installationBaseChannel', key: 'id' }
  },
  // Configuration Zigbee
  zigbeePanId: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'PAN ID Zigbee pour réseau maillé'
  },
  // Configuration Cellular
  cellularApn: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'APN pour connexion 4G/5G'
  },
  // Configuration UHF
  uhfFrequencyMhz: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Fréquence UHF en MHz'
  }
})
```

#### Services Mission Options

**1. Mission Context Service** (`src/service/mission/missionContext.service.js`)

Ce service construit le contexte complet nécessaire pour déterminer les modes de mission disponibles :

```javascript
async function buildMissionContext(siteId, machineId) {
  // 1. Récupérer site et machine
  const site = await Site.findByPk(siteId)
  const machine = await Machine.findByPk(machineId)

  // 2. Récupérer toutes les installations du site (actives)
  const installations = await Installation.findAll({
    where: { siteId, uninstalledAt: null },
    include: [
      {
        model: InstallationBaseProfile,
        as: 'baseProfile',
        include: [{
          model: InstallationBaseChannel,
          as: 'channels',
          where: { status: 'active' }
        }]
      }
    ]
  })

  // 3. Identifier la base active
  const activeBase = installations.find(
    inst => inst.baseMode && inst.baseModeStatus === BASE_MODE_STATUS.ACTIVE
  )

  // 4. Analyser les canaux de diffusion
  let baseChannels = []
  if (activeBase && activeBase.baseProfile) {
    baseChannels = activeBase.baseProfile.channels.map(ch => ({
      type: ch.type,
      status: ch.status,
      isPrimary: ch.isPrimary,
      priority: ch.priority
    }))
  }

  // 5. Vérifier connectivité 4G et position
  const has4GConnection = await check4GConnectivity(machine)
  const hasUserProvidedPosition = await hasManualPosition(installation)

  // 6. Retourner contexte complet
  return {
    siteId,
    machineId,
    siteName: site.name,
    machineRef: machine.macD,
    hasActiveBase: !!activeBase,
    baseInstallationId: activeBase?.id,
    baseChannels,
    has4GConnection,
    hasUserProvidedPosition,
    canBeBase: !activeBase || isFirstIotOnSite,
    isFirstIotOnSite: installations.length === 0
  }
}
```

**2. Mission Modes Service** (`src/service/mission/missionModes.service.js`)

Ce service calcule les modes de mission disponibles selon le contexte :

```javascript
function computeAvailableMissionModes(context) {
  return [
    computeBaseMode(context),           // Mode BASE
    computeRtkRealtimeMode(context),   // Mode RTK Temps Réel
    computePostProcessingMode(context) // Mode Post-Processing (toujours disponible)
  ]
}

function computeBaseMode(context) {
  const mode = {
    type: 'base',
    label: 'Définir comme base RTK',
    description: 'Transformer ce device en station de base',
    available: false,
    requirements: [],
    warnings: [],
    availableChannels: []
  }

  // Vérifier si peut être base
  if (!context.canBeBase) {
    mode.warnings.push({
      level: 'error',
      message: `Une base est déjà active : ${context.baseInstallationRef}`,
      solution: 'Désactivez la base existante avant d\'en créer une nouvelle'
    })
    return mode
  }

  mode.available = true

  // Vérifier la position
  if (!context.hasUserProvidedPosition && !context.has4GConnection) {
    mode.warnings.push({
      level: 'warning',
      message: 'Position non connue avec précision',
      solution: 'Une mission post-processing de 24h sera nécessaire'
    })
  }

  // Canaux disponibles
  mode.availableChannels = [
    {
      type: 'zigbee',
      label: 'Zigbee',
      range: '~100m',
      recommended: true
    },
    {
      type: 'cellular',
      label: '4G/5G',
      range: 'Illimitée',
      recommended: context.has4GConnection,
      requiresConnectivity: true
    },
    {
      type: 'uhf',
      label: 'Radio UHF',
      range: '~5km',
      status: 'development'
    }
  ]

  return mode
}

function computeRtkRealtimeMode(context) {
  const mode = {
    type: 'rtk_realtime',
    label: 'Mission RTK temps réel',
    available: false,
    subModes: [],
    requirements: []
  }

  // Vérifier si base disponible
  if (!context.hasActiveBase) {
    mode.warnings = [{
      level: 'info',
      message: 'Aucune base RTK active sur ce site'
    }]
    return mode
  }

  // Vérifier canaux disponibles
  if (context.baseChannels.length === 0) {
    mode.warnings = [{
      level: 'warning',
      message: 'Aucun canal de diffusion actif sur la base'
    }]
    return mode
  }

  // Mode RTK disponible !
  mode.available = true
  mode.baseInstallationId = context.baseInstallationId

  // Sous-modes RTK (selon source: base locale ou NTRIP)
  const sourceType = mode.source === 'local_base' ? 'base' : 'ntrip'

  mode.subModes = [
    {
      value: `static_unique_rtk_${sourceType}`,
      label: 'Point fixe unique RTK',
      precision: 'Centimétrique en temps réel',
      duration: { min: 5, recommended: 30, unit: 'minutes' },
      source: mode.source
    },
    {
      value: `static_recurrent_rtk_${sourceType}`,
      label: 'Points fixes récurrents RTK',
      precision: 'Centimétrique en temps réel',
      duration: { min: 5, recommended: 30, unit: 'minutes' },
      source: mode.source
    },
    {
      value: 'rover',
      label: 'Mode Rover (cinématique)',
      precision: 'Centimétrique en mouvement',
      note: 'Mode pour déplacements et levés mobiles',
      source: mode.source
    }
  ]

  return mode
}

function generateRecommendations(context, availableModes) {
  const recommendations = []

  // Recommandation : créer une base d'abord
  if (!context.hasActiveBase && !context.isFirstIotOnSite) {
    recommendations.push({
      priority: 'high',
      type: 'create_base',
      message: 'Aucune base RTK sur ce site',
      action: 'Définissez un IoT comme base pour activer le mode RTK',
      benefit: 'Positions précises immédiates pour tous les futurs IoT'
    })
  }

  // Recommandation : premier IoT = base recommandée
  if (context.isFirstIotOnSite) {
    recommendations.push({
      priority: 'high',
      type: 'first_iot_as_base',
      message: 'Premier IoT sur ce site',
      action: 'Il est recommandé de définir ce premier IoT comme base RTK'
    })
  }

  return recommendations
}
```

#### Endpoints Mission Options

**1. Calculer les modes de mission disponibles**

```http
POST /api/sites/:siteId/machines/:machineId/available-mission-modes
Authorization: Bearer <jwt_token>
```

**Réponse** :
```json
{
  "ok": true,
  "context": {
    "siteId": 10,
    "machineId": 5,
    "siteName": "Chantier A",
    "machineRef": "AA:BB:CC:DD:EE:FF",
    "hasActiveBase": true,
    "baseInstallationRef": "BASE-2025-001",
    "installationCount": 3,
    "timestamp": "2025-10-17T14:30:00Z"
  },
  "availableModes": [
    {
      "type": "base",
      "label": "Définir comme base RTK",
      "available": false,
      "warnings": [{
        "level": "error",
        "message": "Une base est déjà active sur ce site : BASE-2025-001"
      }]
    },
    {
      "type": "rtk_realtime",
      "label": "Mission RTK temps réel",
      "available": true,
      "baseInstallationId": 123,
      "source": "local_base",
      "subModes": [
        {
          "value": "static_unique_rtk_base",
          "label": "Point fixe unique RTK",
          "precision": "Centimétrique en temps réel",
          "duration": { "min": 5, "recommended": 30, "unit": "minutes" },
          "source": "local_base"
        },
        {
          "value": "static_recurrent_rtk_base",
          "label": "Points fixes récurrents RTK",
          "precision": "Centimétrique en temps réel",
          "duration": { "min": 5, "recommended": 30, "unit": "minutes" },
          "source": "local_base"
        },
        {
          "value": "rover",
          "label": "Mode Rover (cinématique)",
          "precision": "Centimétrique en mouvement",
          "source": "local_base"
        }
      ],
      "channels": [
        {
          "type": "zigbee",
          "label": "Zigbee",
          "range": "~100m",
          "isPrimary": true,
          "status": "active"
        },
        {
          "type": "cellular",
          "label": "4G/5G",
          "range": "Illimitée",
          "isPrimary": false,
          "status": "active"
        }
      ],
      "estimatedRange": { "min": 0, "max": "Infinity", "unit": "illimité" },
      "advantages": [
        "Position précise immédiate (temps réel)",
        "Pas de post-processing nécessaire",
        "Résultats consultables instantanément"
      ]
    },
    {
      "type": "post_processing",
      "label": "Mission Post-Processing",
      "available": true,
      "subModes": [
        {
          "value": "static_unique_ppk",
          "label": "Static unique PPK",
          "processingType": "ppk",
          "precision": "Centimétrique après traitement",
          "duration": { "min": 30, "recommended": 120, "unit": "minutes" }
        },
        {
          "value": "static_recurrent_ppk",
          "label": "Static récurrent PPK",
          "processingType": "ppk",
          "precision": "Centimétrique après traitement",
          "duration": { "min": 30, "recommended": 120, "unit": "minutes" }
        }
      ],
      "advantages": [
        "Toujours disponible (mode de secours)",
        "Pas besoin de base sur site",
        "Précision centimétrique après traitement"
      ]
    }
  ],
  "recommendations": [
    {
      "priority": "medium",
      "type": "use_rtk",
      "message": "Base RTK active détectée",
      "action": "Privilégiez le mode RTK temps réel pour des résultats immédiats",
      "benefit": "Pas de post-processing nécessaire, gain de temps considérable"
    }
  ],
  "meta": {
    "version": "1.0",
    "generatedAt": "2025-10-17T14:30:00Z"
  }
}
```

**2. Obtenir le statut de la base RTK**

```http
GET /api/sites/:siteId/base-status
Authorization: Bearer <jwt_token>
```

**Réponse** :
```json
{
  "ok": true,
  "siteId": 10,
  "hasActiveBase": true,
  "base": {
    "installationId": 123,
    "installationRef": "BASE-2025-001",
    "machineId": 3,
    "status": "active",
    "activatedAt": "2025-10-15T10:00:00Z",
    "channels": [
      {
        "type": "zigbee",
        "label": "zigbee",
        "isPrimary": true,
        "status": "active"
      },
      {
        "type": "cellular",
        "label": "cellular",
        "isPrimary": false,
        "status": "active"
      }
    ],
    "estimatedRange": {
      "min": 0,
      "max": "Infinity",
      "unit": "illimité"
    }
  }
}
```

#### Contrôleur Mission Options

```javascript
// controller/missionOptions.controller.js
const { buildMissionContext } = require('../service/mission/missionContext.service')
const {
  computeAvailableMissionModes,
  generateRecommendations
} = require('../service/mission/missionModes.service')

exports.getAvailableMissionModes = async (req, res) => {
  try {
    const siteId = z.coerce.number().int().positive().parse(req.params.siteId)
    const machineId = z.coerce.number().int().positive().parse(req.params.machineId)

    // Construire le contexte complet
    const context = await buildMissionContext(siteId, machineId)

    // Calculer les modes disponibles
    const availableModes = computeAvailableMissionModes(context)

    // Générer les recommandations intelligentes
    const recommendations = generateRecommendations(context, availableModes)

    return res.json({
      ok: true,
      context: {
        siteId: context.siteId,
        machineId: context.machineId,
        siteName: context.siteName,
        hasActiveBase: context.hasActiveBase,
        baseInstallationRef: context.baseInstallationRef
      },
      availableModes,
      recommendations
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error.message || 'Erreur lors du calcul des modes disponibles'
    })
  }
}
```

#### Intégration Frontend

Le frontend interroge maintenant le backend pour connaître les modes disponibles au lieu de décider seul :

```typescript
// Frontend - useAvailableMissionModes.ts
export function useAvailableMissionModes(siteId: number, machineId: number) {
  const [modes, setModes] = useState<MissionMode[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  useEffect(() => {
    const fetchModes = async () => {
      const response = await httpClient.post(
        `/api/sites/${siteId}/machines/${machineId}/available-mission-modes`
      )

      setModes(response.data.availableModes)
      setRecommendations(response.data.recommendations)
    }

    fetchModes()
  }, [siteId, machineId])

  return { modes, recommendations }
}
```

#### Avantages Smart Backend

**1. Logique centralisée**
- Évite la duplication de logique complexe dans le frontend
- Un seul endroit pour maintenir les règles métier

**2. Contexte complet**
- Le backend a accès à toutes les données (installations, canaux, connectivité)
- Décisions basées sur l'état réel de la base de données

**3. Sécurité**
- Les règles métier ne peuvent pas être contournées côté client
- Validation serveur des modes autorisés

**4. Évolutivité**
- Ajout facile de nouveaux modes ou critères
- Recommandations intelligentes personnalisées

**5. Performance**
- Une seule requête pour obtenir tous les modes + recommandations
- Cache possible côté serveur pour optimisation

### Modèle Processing et Calculs
```javascript
// models/calculation.model.js
const Calculation = sequelize.define('calculation', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  status: {
    type: Sequelize.ENUM,
    values: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
    defaultValue: 'QUEUED'
  },
  processingEngine: {
    type: Sequelize.ENUM,
    values: ['RTKLIB', 'RTKLib2', 'CUSTOM'],
    defaultValue: 'RTKLIB'
  },
  inputFiles: {
    type: Sequelize.JSON,  // Liste fichiers .ubx
    allowNull: false
  },
  outputFiles: {
    type: Sequelize.JSON,  // Résultats: .pos, .log, .kml
    defaultValue: {}
  },
  coordinates: {
    type: Sequelize.JSON,  // Résultat final: lat/lon/h + accuracy
    defaultValue: null
  },
  processingLog: {
    type: Sequelize.TEXT,  // Logs détaillés RTKLIB
    allowNull: true
  },
  accuracy: {
    type: Sequelize.JSON,  // Précision: horizontal, vertical, RMS
    defaultValue: null
  },
  startedAt: Sequelize.DATE,
  completedAt: Sequelize.DATE,
  duration_ms: Sequelize.INTEGER
})
```

---

## 🚀 API REST et Endpoints

### OpenAPI Auto-Discovery
```javascript
// routes/openapi.routes.js
const express = require('express')
const router = express.Router()
const yaml = require('js-yaml')
const fs = require('fs')

// Endpoint discovery pour frontend
router.get('/api/openapi', (req, res) => {
  try {
    const openApiSpec = yaml.load(fs.readFileSync('./docs/openapi.yaml', 'utf8'))
    res.json(openApiSpec)
  } catch (error) {
    res.status(500).json({ error: 'Failed to load OpenAPI specification' })
  }
})

// Routes dynamiques extraction
router.get('/api/routes', (req, res) => {
  const routes = []

  // Extract all registered routes
  req.app._router.stack.forEach(middleware => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods)
      routes.push({
        path: middleware.route.path,
        methods: methods,
        name: middleware.route.path.replace(/[\/\:]/g, '_')
      })
    }
  })

  res.json({ routes })
})
```

### Authentication Endpoints
```javascript
// routes/auth.routes.js
module.exports = function(app) {
  app.use('/api/auth', require('cors')())

  // User authentication
  app.post('/api/auth/login', [verifySignUp.checkDuplicateCredentials], controller.signin)
  app.post('/api/auth/signup', [verifySignUp.checkDuplicateUsernameOrEmail], controller.signup)
  app.post('/api/auth/logout', [authJwt.verifyToken], controller.signout)

  // Token management
  app.post('/api/auth/refreshtoken', controller.refreshToken)

  // User profile et hydratation
  app.get('/api/me', [authJwt.verifyToken], controller.getUserProfile)
  app.get('/api/me/hydrate', [authJwt.verifyToken], controller.hydrateUserData)
}
```

### CRUD Resources Endpoints
```javascript
// routes/machine.routes.js - IoT Devices
module.exports = function(app) {
  // Machines CRUD
  app.get('/api/machines', [authJwt.verifyToken], controller.findAll)
  app.get('/api/machines/:id', [authJwt.verifyToken], controller.findOne)
  app.post('/api/machines', [authJwt.verifyToken, verifyRole('ROLE_USER')], controller.create)
  app.put('/api/machines/:id', [authJwt.verifyToken], controller.update)
  app.delete('/api/machines/:id', [authJwt.verifyToken, verifyRole('ROLE_MODERATOR')], controller.delete)

  // Machine status et heartbeat
  app.post('/api/machines/:id/heartbeat', [authJwt.verifyToken], controller.updateHeartbeat)
  app.get('/api/machines/:id/status', [authJwt.verifyToken], controller.getStatus)
}

// routes/site.routes.js - Geographic Sites
module.exports = function(app) {
  // Sites CRUD
  app.get('/api/sites', [authJwt.verifyToken], controller.findAll)
  app.post('/api/sites', [authJwt.verifyToken], controller.create)
  app.put('/api/sites/:id', [authJwt.verifyToken], controller.update)
  app.delete('/api/sites/:id', [authJwt.verifyToken, verifyRole('ROLE_MODERATOR')], controller.delete)

  // Site sharing
  app.post('/api/sites/:id/share', [authJwt.verifyToken], controller.shareWithUser)
  app.delete('/api/sites/:id/share/:userId', [authJwt.verifyToken], controller.unshareWithUser)
}

// routes/campaign.routes.js - GNSS Campaigns
module.exports = function(app) {
  // Campaigns CRUD
  app.get('/api/campaigns', [authJwt.verifyToken], controller.findAll)
  app.post('/api/campaigns', [authJwt.verifyToken], controller.create)
  app.put('/api/campaigns/:id', [authJwt.verifyToken], controller.update)
  app.delete('/api/campaigns/:id', [authJwt.verifyToken], controller.delete)

  // Campaign execution
  app.post('/api/campaigns/:id/start', [authJwt.verifyToken], controller.startCampaign)
  app.post('/api/campaigns/:id/stop', [authJwt.verifyToken], controller.stopCampaign)
  app.get('/api/campaigns/:id/status', [authJwt.verifyToken], controller.getStatus)
}

// routes/missionOptions.routes.js - Smart Mission Modes (NEW)
module.exports = function(app) {
  // Calculate available mission modes based on context
  app.post('/api/sites/:siteId/machines/:machineId/available-mission-modes',
    [authJwt.verifyToken],
    controller.getAvailableMissionModes
  )

  // Get base RTK status for a site
  app.get('/api/sites/:siteId/base-status',
    [authJwt.verifyToken],
    controller.getSiteBaseStatus
  )
}
```

### File Upload et Processing
```javascript
// routes/upload.routes.js
const multer = require('multer')

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '.ubx')
  }
})

const fileFilter = (req, file, cb) => {
  // Accept only .ubx files
  if (file.mimetype === 'application/octet-stream' && file.originalname.endsWith('.ubx')) {
    cb(null, true)
  } else {
    cb(new Error('Only .ubx files are allowed!'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
})

module.exports = function(app) {
  // Single file upload
  app.post('/api/upload/ubx',
    [authJwt.verifyToken],
    upload.single('ubxFile'),
    controller.uploadUbxFile
  )

  // Multiple files upload
  app.post('/api/upload/ubx/batch',
    [authJwt.verifyToken],
    upload.array('ubxFiles', 10),
    controller.uploadMultipleUbxFiles
  )

  // Processing trigger
  app.post('/api/processing/calculate',
    [authJwt.verifyToken],
    controller.triggerProcessing
  )
}
```

---

## 🐍 Intégration Python RTKLIB

### Orchestration Processing
```javascript
// utils/processing.js
const { spawn } = require('child_process')
const path = require('path')

class RTKLIBProcessor {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python'
    this.processingScript = path.join(__dirname, '../processing/rtklib_processor.py')
  }

  async processUbxFiles(inputFiles, campaignId, options = {}) {
    return new Promise((resolve, reject) => {
      const args = [
        this.processingScript,
        '--campaign-id', campaignId.toString(),
        '--input-files', inputFiles.join(','),
        '--output-dir', path.join('uploads', 'results', campaignId.toString())
      ]

      // Additional options
      if (options.baseStation) {
        args.push('--base-station', options.baseStation)
      }
      if (options.processingMode) {
        args.push('--processing-mode', options.processingMode)
      }

      console.log(`Starting RTKLIB processing: ${this.pythonPath} ${args.join(' ')}`)

      const pythonProcess = spawn(this.pythonPath, args)
      let stdout = ''
      let stderr = ''

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
        console.log(`[RTKLIB] ${data}`)
      })

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
        console.error(`[RTKLIB ERROR] ${data}`)
      })

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          // Parse results
          try {
            const results = JSON.parse(stdout.split('\n').slice(-2)[0])
            resolve({
              success: true,
              coordinates: results.coordinates,
              accuracy: results.accuracy,
              outputFiles: results.files,
              processingLog: stdout
            })
          } catch (parseError) {
            resolve({
              success: true,
              processingLog: stdout,
              rawOutput: stdout
            })
          }
        } else {
          reject({
            success: false,
            error: `RTKLIB processing failed with code ${code}`,
            stderr,
            stdout
          })
        }
      })
    })
  }

  async getProcessingStatus(calculationId) {
    // Check if processing is still running
    // Implementation depends on your process tracking strategy
    return {
      status: 'PROCESSING',
      progress: 75,
      estimatedTimeRemaining: 120 // seconds
    }
  }
}

module.exports = RTKLIBProcessor
```

### Controller Processing
```javascript
// controllers/processing.controller.js
const RTKLIBProcessor = require('../utils/processing')
const { Calculation, Campaign } = require('../models')

exports.triggerProcessing = async (req, res) => {
  try {
    const { campaignId, inputFiles, processingOptions } = req.body

    // Create calculation record
    const calculation = await Calculation.create({
      campaignId,
      status: 'QUEUED',
      inputFiles: inputFiles,
      processingEngine: 'RTKLIB',
      startedAt: new Date()
    })

    // Start async processing
    const processor = new RTKLIBProcessor()

    // Update status to PROCESSING
    await calculation.update({ status: 'PROCESSING' })

    // Launch processing (async)
    processor.processUbxFiles(inputFiles, campaignId, processingOptions)
      .then(async (results) => {
        // Success: update calculation with results
        await calculation.update({
          status: 'COMPLETED',
          coordinates: results.coordinates,
          accuracy: results.accuracy,
          outputFiles: results.outputFiles,
          processingLog: results.processingLog,
          completedAt: new Date(),
          duration_ms: Date.now() - new Date(calculation.startedAt).getTime()
        })

        // Update campaign status
        await Campaign.update(
          { status: 'COMPLETED' },
          { where: { id: campaignId } }
        )

        console.log(`✅ Processing completed for campaign ${campaignId}`)
      })
      .catch(async (error) => {
        // Failure: update calculation with error
        await calculation.update({
          status: 'FAILED',
          processingLog: error.stderr || error.error,
          completedAt: new Date()
        })

        await Campaign.update(
          { status: 'FAILED' },
          { where: { id: campaignId } }
        )

        console.error(`❌ Processing failed for campaign ${campaignId}:`, error)
      })

    // Return immediate response
    res.status(202).json({
      success: true,
      message: 'Processing started',
      calculationId: calculation.id,
      status: 'PROCESSING'
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to start processing',
      error: error.message
    })
  }
}

exports.getProcessingStatus = async (req, res) => {
  try {
    const { calculationId } = req.params

    const calculation = await Calculation.findByPk(calculationId, {
      include: [
        { model: Campaign, as: 'campaign' },
      ]
    })

    if (!calculation) {
      return res.status(404).json({ message: 'Calculation not found' })
    }

    res.json({
      id: calculation.id,
      status: calculation.status,
      progress: calculation.status === 'PROCESSING' ? 75 : 100,
      coordinates: calculation.coordinates,
      accuracy: calculation.accuracy,
      outputFiles: calculation.outputFiles,
      startedAt: calculation.startedAt,
      completedAt: calculation.completedAt,
      duration_ms: calculation.duration_ms
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

---

## 🔧 Configuration et Déploiement

### Configuration Database
```javascript
// config/db.config.js
module.exports = {
  development: {
    HOST: process.env.DB_HOST || 'localhost',
    USER: process.env.DB_USER || 'trackbee_dev',
    PASSWORD: process.env.DB_PASSWORD || '',
    DB: process.env.DB_NAME || 'trackbee_dev',
    dialect: 'postgres',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  production: {
    HOST: process.env.DB_HOST,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    DB: process.env.DB_NAME,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  }
}
```

### Configuration JWT
```javascript
// config/auth.config.js
module.exports = {
  secret: process.env.JWT_SECRET || "trackbee-secret-key-change-in-production",
  jwtExpiration: 43200,           // 12 hours
  jwtRefreshExpiration: 86400,    // 24 hours

  /* for test */
  jwtSecret: process.env.JWT_SECRET || "trackbee-secret-key",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "trackbee-refresh-secret"
}
```

### Variables d'Environnement
```env
# .env.production
NODE_ENV=production
PORT=3001

# Database
DB_HOST=your-postgres-server.com
DB_USER=trackbee_prod
DB_PASSWORD=secure_password_here
DB_NAME=trackbee_production

# JWT Security
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_REFRESH_SECRET=your-super-secure-refresh-secret

# File Storage
UPLOAD_PATH=/var/trackbee/uploads
MAX_FILE_SIZE=104857600

# Python Processing
PYTHON_PATH=/usr/bin/python3
RTKLIB_PATH=/opt/rtklib

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/trackbee/app.log

# CORS
ALLOWED_ORIGINS=https://app.trackbee.com,https://admin.trackbee.com
```

### Server Startup
```javascript
// server.js
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()

// CORS Configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5180'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token']
}))

// Body parsers
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }))

// Database connection
const db = require('./src/models')

db.sequelize.sync({ force: false }).then(() => {
  console.log('✅ Database synchronized successfully')
}).catch(err => {
  console.error('❌ Failed to sync database:', err)
})

// Routes
require('./src/routes/auth.routes')(app)
require('./src/routes/machine.routes')(app)
require('./src/routes/site.routes')(app)
require('./src/routes/campaign.routes')(app)
require('./src/routes/upload.routes')(app)
require('./src/routes/processing.routes')(app)
require('./src/routes/missionOptions.routes')(app)  // Smart Mission Modes
require('./src/routes/openapi.routes')(app)

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 TrackBee Backend Server running on port ${PORT}`)
})
```

---

## 🧪 Tests et Validation

### Scripts de Test Créés
```javascript
// Validation compatibility backend/frontend
// scriptClaude/test-backend-compatibility.cjs
const axios = require('axios')

async function testBackendCompatibility() {
  const baseURL = 'http://localhost:3001'

  try {
    // Test authentication
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'moderator1@test.com',
      password: 'test123'
    })

    console.log('✅ Login successful')
    console.log('Token:', loginResponse.data.token.substring(0, 20) + '...')

    // Test hydration data
    const token = loginResponse.data.token
    const hydrationResponse = await axios.get(`${baseURL}/api/me/hydrate`, {
      headers: { 'x-access-token': token }
    })

    console.log('✅ Hydration data retrieved')
    console.log('Machines:', hydrationResponse.data.machines?.length || 0)
    console.log('Sites:', hydrationResponse.data.sites?.length || 0)

    return true
  } catch (error) {
    console.error('❌ Backend compatibility test failed:', error.message)
    return false
  }
}
```

### Status Tests
- ✅ **Authentication**: Login/logout JWT functional
- ✅ **CRUD Operations**: Machines, Sites, Campaigns tested
- ✅ **File Upload**: .ubx files upload working
- ✅ **OpenAPI Discovery**: Routes auto-discovery operational
- ✅ **Frontend Integration**: Compatible response formats
- ⏳ **Python Processing**: RTKLIB integration testing
- ⏳ **Load Testing**: Performance under load

---

## 📊 Monitoring et Logging

### Structured Logging
```javascript
// utils/logger.js
const winston = require('winston')

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'trackbee-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

// Usage dans controllers
logger.info('User authenticated', {
  userId: user.id,
  email: user.email,
  ip: req.ip
})

logger.error('Processing failed', {
  campaignId,
  error: error.message,
  stack: error.stack
})
```

### Performance Monitoring
```javascript
// Middleware de monitoring
const performanceMiddleware = (req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info('API Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration_ms: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    })
  })

  next()
}

app.use(performanceMiddleware)
```

---

## 🔐 Sécurité Production

### Security Headers
```javascript
// Security middleware
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
})
app.use('/api/', limiter)

// Auth rate limiting (more restrictive)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true
})
app.use('/api/auth/login', authLimiter)
```

### Input Validation
```javascript
// Validation middleware avec Joi
const Joi = require('joi')

const validateMachine = (req, res, next) => {
  const schema = Joi.object({
    macD: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:]){5}([0-9A-Fa-f]{2})$/).required(),
    name: Joi.string().min(3).max(50).required(),
    siteId: Joi.number().integer().positive().optional()
  })

  const { error } = schema.validate(req.body)
  if (error) {
    return res.status(400).json({
      message: 'Validation error',
      details: error.details
    })
  }
  next()
}
```

---

## 🔄 Communication Backend ↔ IoT (Phase 2)

**Version**: 2.0 | **Date**: 2025-10-18 | **Status**: ✅ Implémenté

### Vue d'ensemble

Le système de communication Backend ↔ IoT permet :
- **Backend → IoT** : Envoyer des commandes aux dispositifs IoT (missions RTK NTRIP, sync RTC, reboot, etc.)
- **IoT → Backend** : Tracking de l'état temps réel (batterie, GPS, RTK, missions actives, stockage, diagnostics)
- **Frontend ↔ Backend** : Visualisation et contrôle en temps réel de l'état des machines

### Architecture : HTTP Polling

**Solution retenue** : HTTP Polling (au lieu de WebSocket/MQTT)

**Raisons** :
- ✅ Compatible avec hébergement O2Switch (pas de WebSocket)
- ✅ Pas de dépendances externes (Supabase, broker MQTT)
- ✅ Architecture simple et robuste
- ✅ IoT dispose déjà de 4G pour upload fichiers

**Fonctionnement** :
```
IoT Device                Backend                 Frontend
   │                        │                         │
   │  Poll commands         │                         │
   │  (every 10-30s)        │                         │
   ├───────────────────────►│                         │
   │◄───────────────────────┤                         │
   │  Return pending cmds   │                         │
   │                        │                         │
   │  Send heartbeat        │                         │
   │  (every 30-60s)        │                         │
   ├───────────────────────►│                         │
   │  {battery, gps, rtk}   │                         │
   │                        │                         │
   │                        │  Get status             │
   │                        │◄────────────────────────┤
   │                        ├────────────────────────►│
   │                        │  {isOnline, battery...} │
```

### Nouveaux Modèles

#### MachineCommand - File de commandes Backend → IoT

**Table** : `machine_commands`

```javascript
{
  id: INTEGER,
  machineId: INTEGER,  // FK → machines.id

  // Type et payload
  commandType: ENUM(
    'start_mission',      // Démarrer mission RTK NTRIP
    'stop_mission',       // Arrêter mission
    'update_config',      // Maj configuration
    'sync_rtc',           // Synchroniser horloge
    'reboot',             // Redémarrer
    'update_firmware',    // OTA firmware
    'enable_rtk_ntrip',   // Activer RTK NTRIP
    'disable_rtk',        // Désactiver RTK
    'delete_files',       // Supprimer fichiers
    'enable_wifi_ap',     // Activer WiFi AP
    'custom'              // Commande custom
  ),
  payload: JSON,        // Données commande (config...)

  // Priorité et statut
  priority: ENUM('low', 'normal', 'high', 'urgent'),
  status: ENUM(
    'pending',    // Créée, pas encore récupérée
    'fetched',    // Récupérée par IoT
    'executing',  // En cours d'exécution
    'completed',  // Terminée avec succès
    'failed',     // Échec
    'cancelled',  // Annulée
    'expired'     // Expirée (expiresAt dépassé)
  ),

  // Résultat
  result: JSON,         // Résultat si completed
  errorMessage: TEXT,   // Erreur si failed

  // Timestamps
  fetchedAt: DATETIME,
  executingAt: DATETIME,
  completedAt: DATETIME,
  expiresAt: DATETIME,  // null = jamais

  // Métadonnées
  createdBy: INTEGER,   // FK → users.id
  retryCount: INTEGER,
  maxRetries: INTEGER,
  notes: TEXT
}
```

**Indexes** :
- `idx_machine_status` : (machineId, status)
- `idx_status_priority_created` : (status, priority, createdAt)
- `idx_expires_at` : (expiresAt)

#### MachineStatus - État temps réel IoT

**Table** : `machine_status` (1-to-1 avec machines)

```javascript
{
  id: INTEGER,
  machineId: INTEGER UNIQUE,

  // === CONNECTIVITÉ ===
  isOnline: BOOLEAN,           // true si lastHeartbeat < 5 min
  lastHeartbeat: DATETIME,
  lastPollAt: DATETIME,
  connectionType: ENUM('4g', 'wifi', 'ethernet', 'ble', 'unknown'),
  ipAddress: STRING(45),
  signalStrength: INTEGER,

  // === ALIMENTATION ===
  batteryLevel: INTEGER,       // 0-100%
  batteryVoltage: FLOAT,       // mV
  isCharging: BOOLEAN,
  powerMode: ENUM('active', 'light_sleep', 'deep_sleep', 'recording'),

  // === GNSS/GPS ===
  gnssStatus: ENUM(
    'off', 'acquiring', 'no_fix',
    'autonomous', 'dgps',
    'rtk_float', 'rtk_fixed'
  ),
  satelliteCount: INTEGER,
  hdop: FLOAT,
  lastGnssFixAt: DATETIME,
  currentLatitude: DECIMAL(10, 8),
  currentLongitude: DECIMAL(11, 8),
  currentAltitude: FLOAT,

  // === RTK ===
  rtkEnabled: BOOLEAN,
  rtkSource: ENUM('none', 'local_base', 'ntrip'),
  rtkBaseId: INTEGER,
  rtkQuality: ENUM('none', 'float', 'fixed'),
  rtkAge: FLOAT,               // secondes

  // === MISSIONS ===
  activeMissionId: INTEGER,
  missionStatus: ENUM('idle', 'scheduled', 'recording', 'paused', 'error'),
  recordingStartedAt: DATETIME,
  recordedDuration: INTEGER,   // secondes

  // === STOCKAGE ===
  storageTotal: BIGINT,        // bytes
  storageUsed: BIGINT,
  fileCount: INTEGER,

  // === FIRMWARE ===
  firmwareVersion: STRING(50),
  hardwareVersion: STRING(50),

  // === DIAGNOSTICS ===
  uptime: BIGINT,              // secondes
  lastRebootAt: DATETIME,
  rebootReason: STRING(100),
  cpuTemp: FLOAT,              // °C
  freeMemory: INTEGER,         // KB
  errorCount: INTEGER,
  lastError: TEXT,
  lastErrorAt: DATETIME,

  // === DONNÉES BRUTES ===
  rawStatus: JSON              // Statut complet brut IoT
}
```

### API Endpoints

#### POST /api/machines/:machineId/heartbeat

**Appelé par** : IoT (toutes les 30-60s)
**Auth** : `verifyToken`, `isMachineOrUser`

**Request** :
```json
{
  "batteryLevel": 85,
  "gnssStatus": "rtk_fixed",
  "rtkEnabled": true,
  "rtkSource": "ntrip",
  "missionStatus": "recording",
  "activeMissionId": 123,
  "storageUsed": 1234567890,
  "firmwareVersion": "v7.2.1"
}
```

**Response** :
```json
{
  "ok": true,
  "status": {
    "id": 1,
    "machineId": 5,
    "isOnline": true,
    "lastHeartbeat": "2025-10-18T14:32:15Z"
  }
}
```

#### GET /api/machines/:machineId/status

**Appelé par** : Frontend
**Auth** : `verifyToken`

**Response** :
```json
{
  "ok": true,
  "status": {
    "isOnline": true,
    "lastHeartbeat": "2025-10-18T14:32:15Z",
    "minutesSinceHeartbeat": 0,
    "batteryLevel": 85,
    "gnssStatus": "rtk_fixed",
    "rtkEnabled": true,
    "rtkQuality": "fixed",
    "missionStatus": "recording",
    "activeMissionId": 123
  }
}
```

#### GET /api/machines/:machineId/commands/pending

**Appelé par** : IoT (polling toutes les 10-30s)
**Auth** : `verifyToken`, `isMachineOrUser`

**Query** : `?limit=10`

**Response** :
```json
{
  "ok": true,
  "count": 2,
  "commands": [
    {
      "id": 42,
      "commandType": "enable_rtk_ntrip",
      "payload": {
        "caster": "caster.centipede.fr",
        "port": 2101,
        "mountpoint": "CENR"
      },
      "priority": "high",
      "createdAt": "2025-10-18T14:30:00Z",
      "expiresAt": "2025-10-18T15:30:00Z"
    }
  ]
}
```

**Logique** :
- Récupère commandes `status IN ('pending', 'fetched')` et `expiresAt > now`
- Tri par `priority DESC, createdAt ASC` (FIFO par priorité)
- Marque automatiquement `status = 'fetched'`

#### POST /api/machines/:machineId/commands/:commandId/ack

**Appelé par** : IoT (ACK exécution)
**Auth** : `verifyToken`, `isMachineOrUser`

**Request** :
```json
{
  "status": "completed",  // ou 'executing', 'failed'
  "result": {
    "rtkStatus": "connected"
  },
  "errorMessage": null
}
```

#### POST /api/machines/:machineId/commands

**Appelé par** : Frontend/Backend
**Auth** : `verifyToken`

**Request** :
```json
{
  "commandType": "enable_rtk_ntrip",
  "payload": {
    "caster": "caster.centipede.fr",
    "port": 2101,
    "mountpoint": "CENR",
    "username": "centipede",
    "password": "centipede"
  },
  "priority": "high",
  "expiresIn": 3600,  // secondes
  "notes": "Mission urgente site X"
}
```

**Response (201)** :
```json
{
  "ok": true,
  "command": {
    "id": 42,
    "status": "pending",
    "createdAt": "2025-10-18T14:30:00Z",
    "expiresAt": "2025-10-18T15:30:00Z"
  }
}
```

#### GET /api/machines/:machineId/commands

**Appelé par** : Frontend (historique)
**Auth** : `verifyToken`

**Query** : `?status=completed&limit=50&offset=0`

#### DELETE /api/machines/:machineId/commands/:commandId

**Appelé par** : Frontend (annuler)
**Auth** : `verifyToken`

**Logique** :
- Si `status = 'executing'` → marque comme `'cancelled'`
- Sinon → supprime l'enregistrement

### Cron Jobs (à implémenter)

```javascript
// Toutes les minutes : expirer les commandes
cron.schedule('* * * * *', async () => {
  await machineCommController.expireOldCommands();
});

// Toutes les minutes : marquer machines offline
cron.schedule('* * * * *', async () => {
  await machineCommController.markMachinesOffline();
  // isOnline = false si lastHeartbeat > 5 min
});
```

### Documentation complète

Voir **BACKEND_IOT_COMMUNICATION.md** pour :
- Architecture détaillée (schémas, flux)
- Implémentation ESP32-C6 (polling, heartbeat)
- Intégration React (hooks, composants)
- Exemples complets de code
- Sécurité, performances, monitoring

---

## ✅ Mission Readiness Verification (Phase 3)

**Version**: 3.0 | **Date**: 2025-10-18 | **Status**: ✅ Implémenté

### Vue d'ensemble

Le système Mission Readiness vérifie qu'une machine IoT est prête avant de démarrer une mission GNSS. Il effectue des healthchecks complets et valide la connectivité NTRIP si nécessaire.

### Service NTRIP Verification

**`src/service/ntrip/ntripVerification.service.js`**

**Fonctions disponibles** :

1. **`testNtripConnection(config, timeout)`** - Teste connexion NTRIP
   - Connexion TCP au caster
   - Envoi requête HTTP avec auth
   - Vérification réponse (200 OK, 401, 404)
   - Retourne : success, responseTime, error

2. **`getNtripSourceTable(caster, port)`** - Récupère mountpoints disponibles
   - Parse la sourcetable NTRIP
   - Liste tous les mountpoints du caster
   - Retourne : mountpoints[], count

3. **`verifyNtripConfig(config)`** - Vérification complète
   - Test connexion
   - Validation temps de réponse
   - Warnings si slow response

### API Endpoints

#### POST /api/machines/:machineId/readiness/check

**Description** : Vérification complète de préparation machine

**Request** :
```json
{
  "missionType": "static_unique_rtk_ntrip",
  "ntripConfigId": 5
}
```

**Vérifications effectuées** :
1. ✅ **Machine online** - heartbeat < 5 min
2. ✅ **Batterie suffisante** - ≥ 20% (warning si < 40%)
3. ✅ **Fix GNSS** - status autonomous/dgps/rtk
4. ✅ **Satellites** - count ≥ 6 (warning si < 6)
5. ✅ **Stockage disponible** - < 90% utilisé
6. ✅ **Aucune mission active** - missionStatus = idle
7. ✅ **NTRIP valide** (si mission RTK NTRIP) - test connexion caster

**Response (200)** :
```json
{
  "ok": true,
  "readinessReport": {
    "ready": true,
    "machineId": 5,
    "missionType": "static_unique_rtk_ntrip",
    "timestamp": "2025-10-18T15:30:00Z",
    "checks": {
      "online": {
        "passed": true,
        "minutesSinceHeartbeat": 1
      },
      "battery": {
        "passed": true,
        "level": 85,
        "isCharging": false
      },
      "gnss": {
        "passed": true,
        "status": "autonomous",
        "satelliteCount": 12,
        "hdop": 0.9
      },
      "storage": {
        "passed": true,
        "usedPercent": 45
      },
      "noActiveMission": {
        "passed": true,
        "currentStatus": "idle"
      },
      "ntrip": {
        "valid": true,
        "checks": {
          "connection": {
            "success": true,
            "responseTime": 852
          }
        }
      }
    },
    "errors": [],
    "warnings": [],
    "message": "Machine prête pour démarrer la mission"
  }
}
```

**Cas d'échec** :
```json
{
  "ok": true,
  "readinessReport": {
    "ready": false,
    "errors": [
      {
        "type": "low_battery",
        "severity": "critical",
        "message": "Batterie faible: 15%",
        "recommendation": "Charger la batterie avant de démarrer la mission"
      },
      {
        "type": "ntrip_unavailable",
        "severity": "critical",
        "message": "Serveur NTRIP non disponible",
        "details": [...]
      }
    ],
    "warnings": [
      {
        "type": "few_satellites",
        "severity": "warning",
        "message": "Peu de satellites visibles: 5"
      }
    ],
    "message": "2 problème(s) critique(s) empêchent le démarrage"
  }
}
```

#### POST /api/ntrip/test-connection

**Description** : Teste une config NTRIP (indépendamment d'une machine)

**Request** :
```json
{
  "caster": "caster.centipede.fr",
  "port": 2101,
  "mountpoint": "CENR",
  "username": "centipede",
  "password": "centipede",
  "timeout": 10000
}
```

**Response (200)** :
```json
{
  "ok": true,
  "result": {
    "success": true,
    "message": "NTRIP connection successful",
    "responseTime": 852,
    "caster": "caster.centipede.fr",
    "port": 2101,
    "mountpoint": "CENR"
  }
}
```

**Cas d'échec** :
```json
{
  "ok": true,
  "result": {
    "success": false,
    "error": "Authentication failed (401 Unauthorized)",
    "responseTime": 1203,
    "statusCode": 401
  }
}
```

#### GET /api/ntrip/sourcetable?caster=xxx&port=2101

**Description** : Liste les mountpoints disponibles sur un caster

**Response (200)** :
```json
{
  "ok": true,
  "success": true,
  "caster": "caster.centipede.fr",
  "port": 2101,
  "mountpointsCount": 145,
  "mountpoints": [
    {
      "mountpoint": "CENR",
      "identifier": "Centipede Rennes",
      "format": "RTCM 3.2",
      "details": "STR;CENR;Centipede Rennes;RTCM 3.2;..."
    },
    ...
  ],
  "responseTime": 1523
}
```

### Workflow Frontend Recommandé

1. **Avant de créer une mission RTK NTRIP** :
   ```typescript
   // 1. Tester la config NTRIP
   const testResult = await httpClient.post('/api/ntrip/test-connection', {
     caster, port, mountpoint, username, password
   });

   if (!testResult.data.result.success) {
     alert('NTRIP non disponible : ' + testResult.data.result.error);
     return;
   }

   // 2. Vérifier readiness de la machine
   const readiness = await httpClient.post(
     `/api/machines/${machineId}/readiness/check`,
     { missionType: 'static_unique_rtk_ntrip', ntripConfigId }
   );

   if (!readiness.data.readinessReport.ready) {
     // Afficher les erreurs à l'utilisateur
     showReadinessErrors(readiness.data.readinessReport.errors);
     return;
   }

   // 3. Tout est OK → Envoyer commande start mission
   await httpClient.post(`/api/machines/${machineId}/commands`, {
     commandType: 'enable_rtk_ntrip',
     payload: { caster, port, mountpoint, ... },
     priority: 'high'
   });
   ```

2. **Découvrir les mountpoints disponibles** :
   ```typescript
   const sourcetable = await httpClient.get(
     `/api/ntrip/sourcetable?caster=caster.centipede.fr&port=2101`
   );

   // Afficher la liste dans un select
   sourcetable.data.mountpoints.forEach(mp => {
     console.log(mp.mountpoint, mp.identifier);
   });
   ```

### Cas d'usage

**Scénario 1** : Tout est prêt
- Machine online, batterie OK, GPS fix, NTRIP ok → `ready: true`
- Frontend peut démarrer la mission immédiatement

**Scénario 2** : Batterie faible
- `ready: false`, error `low_battery`
- Frontend affiche : "⚠️ Batterie trop faible (15%). Veuillez charger avant de démarrer."

**Scénario 3** : NTRIP indisponible
- `ready: false`, error `ntrip_unavailable`
- Frontend affiche : "❌ Serveur NTRIP non accessible. Vérifier config ou choisir autre caster."

**Scénario 4** : Machine offline
- `ready: false`, error `machine_offline`
- Frontend affiche : "📴 Machine hors ligne depuis 12 min. Impossible de démarrer."

---

## 🚀 Roadmap et Améliorations

### Version Actuelle (v3.0)
- ✅ **JWT Authentication** avec refresh tokens
- ✅ **CRUD complet** pour toutes entités
- ✅ **OpenAPI discovery** pour frontend
- ✅ **File upload** .ubx avec validation
- ✅ **Python integration** RTKLIB orchestration
- ✅ **Smart Backend Mission Modes** - Calcul intelligent des modes disponibles
- ✅ **Base RTK Management** - Gestion des bases et canaux de diffusion
- ✅ **IoT Sync Tracking** - Suivi synchronisation campagnes avec devices
- ✅ **Backend ↔ IoT Communication (Phase 2)** - HTTP Polling + heartbeat + cron jobs
- ✅ **Machine Status Tracking** - État temps réel (batterie, GPS, RTK, missions)
- ✅ **Mission Readiness (Phase 3)** - Healthcheck IoT + vérification NTRIP

### TODO - Phase 4 : Alert System (à développer plus tard)

**Objectif** : Détecter les anomalies et alerter l'utilisateur

**Fonctionnalités à implémenter** :
- Détection manquements de transmission (fichiers non uploadés, missions non synchronisées)
- Alertes batterie faible (< 15%)
- Alertes machine offline prolongée (> 1h)
- Alertes échec NTRIP récurrent
- Notifications multi-canal (email, SMS, push app, webhook)
- Système de seuils configurables par utilisateur
- Historique des alertes avec accusé de réception

**Endpoints à créer** :
- `POST /api/alerts/config` - Configurer seuils et notifications
- `GET /api/alerts` - Liste des alertes actives
- `POST /api/alerts/:id/acknowledge` - Accuser réception alerte
- `GET /api/alerts/history` - Historique alertes

**Services à développer** :
- `src/service/alert/alertDetection.service.js` - Détection anomalies
- `src/service/alert/notification.service.js` - Envoi notifications (Nodemailer, Twilio, FCM)
- Cron job: vérification périodique conditions d'alerte

---

### 🌐 Phase 5 : Zigbee Mesh Networking (Architecture avancée)

**Problématique** : Dans des zones sans couverture 4G (forêts, canyons, zones isolées), les IoT ne peuvent pas communiquer avec le backend. Solution : créer un réseau maillé (mesh) entre dispositifs pour propager les données vers un point de connexion 4G.

#### Architecture Zigbee Mesh proposée

**Topologie** :
```
Zone sans 4G                    Zone avec 4G              Backend
┌─────────────────────────┐    ┌────────────┐           ┌────────┐
│                         │    │            │           │        │
│  IoT-A (Rover)         │    │  IoT-D     │           │        │
│  ├─ GNSS recording     │    │  (Gateway) │  ─────4G─►│ API    │
│  └─ Zigbee TX          │    │  ├─ 4G ON  │           │ Server │
│       │                │    │  └─ Zigbee │           │        │
│       │ Zigbee Mesh    │    │     Router │           └────────┘
│       ↓                │    │      ▲     │
│  IoT-B (Base RTK)      │    │      │     │
│  ├─ RTK corrections TX │────┼──────┘     │
│  └─ Zigbee Router      │    │            │
│       │                │    └────────────┘
│       │ Zigbee Mesh
│       ↓
│  IoT-C (Rover)
│  ├─ GNSS recording
│  └─ Zigbee RX/TX
│
└─────────────────────────┘
```

**Rôles Zigbee** :
1. **Coordinator** - IoT-D (Gateway 4G) - 1 seul par réseau
2. **Routers** - IoT-A, IoT-B - Relaient les messages
3. **End Devices** - IoT-C - Peuvent être en sleep mode

#### Cas d'usage concrets

**Scénario 1 : Chantier forestier isolé**
- 5 rovers GNSS dispersés dans la forêt (pas de 4G)
- 1 base RTK au campement (pas de 4G)
- 1 gateway au bord de route (4G disponible)
- Les rovers reçoivent corrections RTK via Zigbee depuis la base
- Les données GNSS sont propagées vers le gateway
- Le gateway upload tout vers le backend via 4G

**Scénario 2 : Canyon/vallée encaissée**
- Plusieurs IoT au fond du canyon (pas de 4G)
- 1 IoT sur la crête avec 4G
- Mesh network pour remonter les données

**Scénario 3 : Site de construction étendu**
- Dizaines d'IoT sur un chantier de plusieurs km²
- Plusieurs gateways 4G en périphérie
- Auto-routing des messages vers le gateway le plus proche

#### Protocole Zigbee pour TrackBee

**Caractéristiques Zigbee** :
- Portée : 10-100m en environnement ouvert (jusqu'à 1km avec antenne externe)
- Débit : 250 kbps (suffisant pour RTCM3 corrections RTK)
- Fréquence : 2.4 GHz (mondiale) ou 868/915 MHz (régionale)
- Consommation : Ultra-low power (essentiel pour IoT sur batterie)
- Auto-routing : Trouvé automatiquement le meilleur chemin

**Messages à propager** :
1. **Corrections RTK** (Base → Rovers)
   - RTCM3 messages (type 1005, 1077, 1087)
   - ~500 bytes/s par rover
   - Latence critique : < 3s

2. **Commandes Backend** (Gateway → IoT)
   - Start/stop mission
   - Update config
   - Sync RTC
   - Taille : ~200 bytes par commande

3. **Status heartbeat** (IoT → Gateway)
   - Batterie, GPS, mission status
   - Taille : ~500 bytes
   - Fréquence : 1x par minute (réduite pour économiser bande passante)

4. **Fichiers GNSS** (IoT → Gateway) - **POST-MISSION uniquement**
   - Fichiers .ubx compressés
   - Taille : 1-50 MB
   - Méthode : Découpage en chunks de 200 bytes + ACK
   - Temps transfert : ~10 min pour 10MB à 250kbps avec overhead

#### Implémentation Hardware

**ESP32-C6 + Zigbee** :
- ✅ ESP32-C6 dispose d'un coprocesseur 802.15.4 (Zigbee/Thread)
- ✅ Stack Zigbee 3.0 supportée par ESP-IDF
- ✅ Coexistence WiFi + BLE + Zigbee possible
- ✅ Antenne externe pour augmenter portée

**Configuration** :
```cpp
// ESP32-C6 - Zigbee initialization
#include "esp_zigbee_core.h"

// Gateway (Coordinator)
esp_zb_cfg_t zb_cfg = {
    .esp_zb_role = ESP_ZB_DEVICE_TYPE_COORDINATOR,
    .install_code_policy = false,
    .nwk_cfg.zczr_cfg = {
        .max_children = 20,  // Support jusqu'à 20 devices
    }
};

// Router/End Device
esp_zb_cfg_t zb_cfg = {
    .esp_zb_role = ESP_ZB_DEVICE_TYPE_ROUTER,
    .install_code_policy = false,
};

// Créer cluster custom pour RTCM3
esp_zb_cluster_cfg_t rtcm_cluster = {
    .cluster_id = 0x8001,  // Custom cluster ID
    .role = ESP_ZB_ROLE_CLIENT | ESP_ZB_ROLE_SERVER,
};
```

#### Backend - Modèle de données

**Nouvelle table `zigbee_networks`** :
```sql
CREATE TABLE zigbee_networks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  siteId INT,  -- FK → sites.id
  coordinatorMachineId INT,  -- FK → machines.id (Gateway)
  panId VARCHAR(16),  -- Zigbee PAN ID (ex: "0x1A2B")
  channel INT,  -- Zigbee channel (11-26)
  networkKey VARCHAR(64),  -- Clé de sécurité réseau
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME,
  FOREIGN KEY (siteId) REFERENCES sites(id),
  FOREIGN KEY (coordinatorMachineId) REFERENCES machines(id)
);

CREATE TABLE zigbee_topology (
  id INT PRIMARY KEY AUTO_INCREMENT,
  networkId INT,  -- FK → zigbee_networks.id
  machineId INT,  -- FK → machines.id
  role ENUM('coordinator', 'router', 'end_device'),
  ieeeAddress VARCHAR(16),  -- Adresse MAC Zigbee
  shortAddress VARCHAR(4),  -- Adresse courte Zigbee
  parentAddress VARCHAR(16),  -- Adresse du parent (routing)
  linkQuality INT,  -- LQI (0-255)
  rssi INT,  -- RSSI (dBm)
  lastSeen DATETIME,
  FOREIGN KEY (networkId) REFERENCES zigbee_networks(id),
  FOREIGN KEY (machineId) REFERENCES machines(id)
);
```

#### Backend - Endpoints API

**Gestion réseau Zigbee** :
```javascript
// POST /api/sites/:siteId/zigbee/network
// Créer un réseau Zigbee pour un site
{
  "coordinatorMachineId": 5,
  "channel": 15,  // Auto ou manuel
  "networkKey": "auto"  // Auto-généré ou fourni
}

// GET /api/sites/:siteId/zigbee/topology
// Visualiser la topologie du réseau mesh
{
  "networkId": 1,
  "coordinator": {...},
  "devices": [
    {
      "machineId": 5,
      "role": "coordinator",
      "children": [6, 7]
    },
    {
      "machineId": 6,
      "role": "router",
      "parent": 5,
      "linkQuality": 230,
      "rssi": -45
    }
  ]
}

// POST /api/machines/:id/zigbee/join
// Faire rejoindre une machine au réseau
{
  "networkId": 1,
  "role": "router"  // ou "end_device"
}

// POST /api/zigbee/networks/:id/route-command
// Router une commande via le mesh
{
  "targetMachineId": 7,
  "command": {
    "commandType": "start_mission",
    "payload": {...}
  }
}
```

#### Frontend - Visualisation mesh

**Composant React** :
```typescript
// <ZigbeeNetworkMap />
// Affiche la topologie du réseau avec D3.js ou vis.js
// - Nodes = IoT devices
// - Edges = Liens Zigbee avec LQI
// - Colors = Rôle (coordinator, router, end_device)
// - Thickness = Link quality
```

#### Avantages Zigbee Mesh

✅ **Portée étendue** : 1 router tous les 50m = couverture de plusieurs km
✅ **Auto-healing** : Si un router tombe, le réseau se reconfigure automatiquement
✅ **Low power** : Consommation très faible (essential pour IoT batterie)
✅ **Scalabilité** : Jusqu'à 65000 devices par réseau
✅ **Sécurité** : AES-128 encryption native
✅ **Corrections RTK temps réel** : Latence suffisamment faible pour RTK

#### Limitations et considérations

⚠️ **Latence** : +100-500ms par hop (acceptable pour RTK si < 3s total)
⚠️ **Bande passante limitée** : 250 kbps partagés → pas idéal pour upload fichiers .ubx volumineux
⚠️ **Complexité** : Gestion de la topologie, routing, diagnostics réseau
⚠️ **Interférences 2.4 GHz** : WiFi/BLE sur même fréquence (préférer 868/915 MHz si disponible)
⚠️ **Coût** : Module Zigbee externe si ESP32-C6 802.15.4 pas suffisant

#### Alternative : LoRaWAN

**Comparaison Zigbee vs LoRaWAN** :

| Critère | Zigbee Mesh | LoRaWAN |
|---------|-------------|---------|
| Portée | 10-100m par hop | 2-15 km direct |
| Débit | 250 kbps | 0.3-50 kbps |
| Topologie | Mesh auto-routé | Star (via gateway) |
| Latence | Moyenne (100ms/hop) | Élevée (1-10s) |
| Consommation | Ultra-low | Ultra-low |
| Coût | Module ~5€ | Module ~10€ + gateway LoRaWAN |
| RTK temps réel | ✅ Oui | ❌ Trop lent |

**Recommandation** : **Zigbee Mesh** pour TrackBee car :
- RTK corrections temps réel nécessaires (latence critique)
- Mesh = couverture flexible sans infrastructure fixe
- ESP32-C6 dispose déjà du hardware 802.15.4

#### Stratégie hybride recommandée

**Ordre de priorité communication** :
1. **4G** (si disponible) → Backend direct
2. **Zigbee Mesh** (si pas de 4G) → Propagation vers gateway 4G
3. **BLE + App** (si ni 4G ni Zigbee) → Récupération manuelle via smartphone

**Workflow** :
- IoT tente d'abord 4G
- Si échec → Rejoint réseau Zigbee du site (broadcast)
- Envoie heartbeat réduit via mesh (1x/min au lieu de 30s)
- Reçoit commandes et corrections RTK via mesh
- Upload fichiers .ubx POST-MISSION quand 4G retrouvée (ou via gateway mesh en arrière-plan)

#### ✅ Implémentation Backend Phase 5 - COMPLÉTÉE

**Status** : ✅ Backend opérationnel (IoT et App à implémenter plus tard)

**Modèles de données créés** :

1. **`zigbee_networks`** - Gestion des réseaux mesh
```javascript
{
  networkId: "FOREST_ZONE_A",        // Identifiant unique
  name: "Réseau Forêt Zone A",
  panId: "0x1A2B",                   // PAN ID Zigbee (16-bit hex unique)
  channel: 15,                        // Canal 802.15.4 (11-26)
  securityEnabled: true,
  networkKey: "...",                  // Clé AES-128 (16 bytes hex)
  coordinatorMachineId: 42,           // Machine Coordinator
  coordinatorIeeeAddress: "00:12:4B:00:1C:A1:B8:46",
  status: "active",                   // planned | forming | active | suspended | archived
  deviceCount: 5,
  maxDepth: 5,                        // Profondeur max de l'arbre
  maxChildren: 20,                    // Max enfants par routeur
  maxRouters: 10,
  lastHealthCheck: "2025-01-18T10:30:00Z",
  healthScore: 85,                    // Score santé 0-100
  location: { type: "Polygon", coordinates: [...] }  // GeoJSON
}
```

2. **`zigbee_topology`** - Topologie des devices dans le mesh
```javascript
{
  networkId: "FOREST_ZONE_A",
  machineId: 43,
  ieeeAddress: "00:12:4B:00:1C:A1:B8:47",  // Adresse IEEE 64-bit (permanent)
  shortAddress: "0x0001",                   // Adresse courte 16-bit (dynamic)
  deviceRole: "router",                     // coordinator | router | end_device
  depth: 1,                                 // Profondeur dans l'arbre
  parentIeeeAddress: "00:12:4B:00:1C:A1:B8:46",
  parentShortAddress: "0x0000",
  childrenCount: 2,
  neighborsCount: 3,
  avgLqi: 220,                              // Link Quality Indicator (0-255)
  avgRssi: -55,                             // RSSI en dBm
  parentLqi: 240,
  parentRssi: -48,
  routingTableSize: 5,
  neighborTableSize: 3,
  joinedAt: "2025-01-18T09:00:00Z",
  lastSeen: "2025-01-18T10:35:00Z",
  status: "online",                         // joining | online | offline | left
  capabilities: {
    deviceType: "FFD",                      // FFD (Full Function Device) ou RFD
    powerSource: "mains",                   // mains | battery
    rxOnWhenIdle: true
  },
  metrics: {
    packetsSent: 1234,
    packetsReceived: 987,
    routingFailures: 2
  },
  neighbors: [
    {
      ieeeAddress: "00:12:4B:00:1C:A1:B8:46",
      shortAddress: "0x0000",
      lqi: 240,
      rssi: -48
    },
    ...
  ],
  routes: [...],
  position: { lat: 48.8566, lng: 2.3522, alt: 35 }
}
```

**API Endpoints implémentés** :

**Gestion réseaux** :
- ✅ `POST /api/zigbee/networks` - Créer réseau mesh
- ✅ `GET /api/zigbee/networks` - Lister réseaux
- ✅ `GET /api/zigbee/networks/:networkId` - Détails réseau
- ✅ `PUT /api/zigbee/networks/:networkId` - Modifier réseau
- ✅ `DELETE /api/zigbee/networks/:networkId` - Supprimer réseau
- ✅ `POST /api/zigbee/networks/:networkId/rotate-key` - Régénérer clé réseau (sécurité)
- ✅ `GET /api/zigbee/networks/:networkId/health` - Healthcheck réseau

**Gestion topologie** :
- ✅ `POST /api/zigbee/topology/update` - MAJ topologie device (appelé par IoT)
- ✅ `GET /api/zigbee/networks/:networkId/topology` - Topologie complète + graphe
- ✅ `GET /api/zigbee/topology/:machineId` - Topologie d'un device
- ✅ `DELETE /api/zigbee/topology/:machineId` - Retirer device du réseau
- ✅ `GET /api/zigbee/networks/:networkId/metrics` - Métriques agrégées réseau

**Exemple d'utilisation - Créer un réseau** :

```bash
POST /api/zigbee/networks
Authorization: Bearer eyJhbGc...

{
  "networkId": "FOREST_ZONE_A",
  "name": "Réseau Forêt Zone A",
  "panId": "0x1A2B",
  "channel": 15,
  "coordinatorMachineId": 42,
  "maxDepth": 5,
  "location": {
    "type": "Polygon",
    "coordinates": [[[2.35, 48.85], [2.36, 48.85], [2.36, 48.86], [2.35, 48.86], [2.35, 48.85]]]
  }
}

Réponse:
{
  "ok": true,
  "network": {
    "networkId": "FOREST_ZONE_A",
    "networkKey": "a3f2e1d4c5b6a7f8e9d0c1b2a3f4e5d6",  // Clé AES-128 générée
    "panId": "0x1A2B",
    ...
  }
}
```

**Exemple - IoT rejoint le réseau et reporte sa topologie** :

```bash
POST /api/zigbee/topology/update
Authorization: Bearer <machine-token>

{
  "networkId": "FOREST_ZONE_A",
  "machineId": 43,
  "ieeeAddress": "00:12:4B:00:1C:A1:B8:47",
  "shortAddress": "0x0001",
  "deviceRole": "router",
  "depth": 1,
  "parentIeeeAddress": "00:12:4B:00:1C:A1:B8:46",
  "parentShortAddress": "0x0000",
  "neighbors": [
    {
      "ieeeAddress": "00:12:4B:00:1C:A1:B8:46",
      "shortAddress": "0x0000",
      "lqi": 240,
      "rssi": -48
    },
    {
      "ieeeAddress": "00:12:4B:00:1C:A1:B8:48",
      "shortAddress": "0x0002",
      "lqi": 180,
      "rssi": -67
    }
  ],
  "metrics": {
    "packetsSent": 156,
    "packetsReceived": 134,
    "routingFailures": 0
  },
  "position": { "lat": 48.8566, "lng": 2.3522, "alt": 35 }
}
```

**Exemple - Récupérer topologie réseau pour visualisation** :

```bash
GET /api/zigbee/networks/FOREST_ZONE_A/topology

Réponse:
{
  "ok": true,
  "networkId": "FOREST_ZONE_A",
  "deviceCount": 5,
  "devices": [...],
  "graph": {
    "nodes": [
      {
        "id": "00:12:4B:00:1C:A1:B8:46",
        "machineId": 42,
        "machineName": "TrackBee #42",
        "shortAddress": "0x0000",
        "role": "coordinator",
        "depth": 0,
        "status": "online",
        "avgLqi": 255,
        "neighborsCount": 3
      },
      {
        "id": "00:12:4B:00:1C:A1:B8:47",
        "machineId": 43,
        "role": "router",
        "depth": 1,
        "avgLqi": 210,
        "parentLqi": 240
      }
    ],
    "edges": [
      {
        "from": "00:12:4B:00:1C:A1:B8:46",
        "to": "00:12:4B:00:1C:A1:B8:47",
        "lqi": 240,
        "rssi": -48,
        "type": "parent"
      }
    ]
  }
}
```

**Healthcheck réseau** :

```bash
GET /api/zigbee/networks/FOREST_ZONE_A/health

Réponse:
{
  "ok": true,
  "health": {
    "healthScore": 85,
    "totalDevices": 5,
    "onlineDevices": 4,
    "offlineDevices": 1,
    "avgLqi": 210,
    "avgRssi": -58,
    "issues": [
      {
        "type": "low_lqi",
        "deviceId": 45,
        "ieeeAddress": "00:12:4B:00:1C:A1:B8:49",
        "lqi": 95,
        "message": "Device 45 a un LQI faible (95)"
      }
    ],
    "recommendations": [
      "1 device(s) hors ligne - Vérifier alimentation et position",
      "LQI moyen faible - Repositionner les devices pour améliorer la qualité de signal"
    ]
  }
}
```

**Fichiers créés** :
- ✅ `src/db/models/zigbeeNetwork.model.js` - Modèle Sequelize réseau mesh
- ✅ `src/db/models/zigbeeTopology.model.js` - Modèle Sequelize topologie
- ✅ `migrations/create_zigbee_tables.sql` - Migration SQL
- ✅ `src/controller/zigbeeNetwork.controller.js` - Contrôleur CRUD réseaux + healthcheck
- ✅ `src/controller/zigbeeTopology.controller.js` - Contrôleur topologie + métriques
- ✅ `src/route/zigbee.route.js` - Routes Zigbee avec Swagger complet
- ✅ `src/db/index.model.js` - Associations Zigbee ajoutées
- ✅ `server.js` - Routes Zigbee enregistrées

**Rôle du Backend dans le Mesh** :

Le backend **NE PARTICIPE PAS** au mesh Zigbee lui-même (le mesh est autonome sur les ESP32-C6). Le backend fournit une **couche d'orchestration** :

1. **Configuration réseau** : Génère PAN ID, canal, clés de sécurité
2. **Supervision topologie** : Stocke et visualise la structure du mesh
3. **Monitoring santé** : Détecte problèmes (LQI faible, devices offline)
4. **Coordination missions** : Décide qui envoie les corrections RTK via mesh
5. **Visualisation** : Graphe réseau pour l'app (nodes + edges)

**Le mesh Zigbee fonctionne de manière autonome sur les IoT** (routage, auto-healing, découverte voisins) même si le backend est down.

**TODO - Implémentation IoT (trackbee_iot.md)** :
- 🔧 Implémenter stack ESP-ZIGBEE sur ESP32-C6
- 🔧 Formation réseau (Coordinator)
- 🔧 Jonction réseau (Router/End Device)
- 🔧 Broadcast corrections RTCM3 sur mesh
- 🔧 Polling heartbeat + topologie vers backend

**TODO - Intégration App (trackbee_app.md)** :
- 🔧 Interface création/gestion réseaux Zigbee
- 🔧 Visualisation topologie mesh (graphe interactif)
- 🔧 Monitoring santé réseau en temps réel
- 🔧 Alertes problèmes mesh (LQI faible, devices offline)

---

### Améliorations Prévues (v3.1+)
- 🔧 **BLE Fallback**: Communication locale via app si 4G indisponible
- 🔧 **Redis caching**: Performance API responses
- 🔧 **Docker**: Containerization complète
- 🔧 **GraphQL**: Alternative API plus flexible
- 🔧 **UHF Channel Support**: Développement du canal radio UHF

### Intégration Ecosystem
- 📱 **TrackBee App2**: Mobile React application
- 📡 **TrackBee IoT**: ESP32-C6 devices BLE/WiFi
- 🐍 **TrackBee Python**: RTKLIB processing engine
- ☁️ **Cloud Platform**: AWS/Docker deployment

---

## 🎯 Conclusion

TrackBee Backend est un serveur API Node.js robuste et professionnel pour l'orchestration d'un écosystème IoT GNSS complet:

### ✅ **Production Ready**
- **Architecture MVC** avec Sequelize ORM
- **JWT Authentication** sécurisé + refresh tokens
- **OpenAPI 3.0** auto-discovery pour integration
- **File processing** .ubx avec Python RTKLIB
- **Error handling** et logging structuré

### ✅ **Integration Validée**
- **Frontend TrackBee App2**: API compatibility testée
- **IoT ESP32-C6**: Endpoints métadonnées prêts
- **Python Processing**: RTKLIB orchestration opérationnelle
- **Database**: Modèles relationnels optimisés

### ✅ **Fonctionnalités Complètes**
- **User Management**: Roles + permissions + sharing
- **Device Management**: Machines IoT + heartbeat + BLE tracking
- **Site Management**: Geographic locations + geocoding
- **Campaign Management**: GNSS measurement orchestration + IoT sync
- **File Processing**: Upload + RTKLIB + results
- **Smart Mission Modes**: Calcul intelligent des modes disponibles (base/RTK/PP)
- **Base RTK Management**: Gestion bases + canaux multi-protocoles (Zigbee/4G/UHF)
- **Intelligent Recommendations**: Recommandations contextuelles pour l'utilisateur
- **Backend ↔ IoT Communication**: HTTP Polling pour commandes + tracking temps réel
- **Machine Status Monitoring**: Batterie, GPS, RTK, missions, stockage, diagnostics
- **Mission Readiness**: Healthcheck IoT + vérification NTRIP avant démarrage
- **Zigbee Mesh Networking**: Orchestration réseaux mesh + topologie + healthcheck (Phase 5 ✅)

Le backend est **opérationnel** et **intégré** avec succès dans l'écosystème TrackBee pour orchestrer des mesures GNSS professionnelles autonomes. Le système **Smart Backend** offre désormais une intelligence décisionnelle avancée pour guider l'utilisateur dans le choix optimal des modes de mission selon le contexte (base disponible, connectivité, position, etc.).

La **Phase 2** implémente une communication bidirectionnelle Backend ↔ IoT via HTTP Polling, permettant d'envoyer des commandes (missions RTK NTRIP, sync RTC, etc.) et de tracker l'état en temps réel de chaque dispositif.

La **Phase 3** ajoute un système de vérification Mission Readiness qui valide que toutes les conditions sont réunies avant de démarrer une mission (machine online, batterie OK, GPS fix, NTRIP disponible, stockage suffisant).

La **Phase 5** implémente la gestion des réseaux mesh Zigbee pour permettre la communication entre dispositifs dans les zones sans 4G. Le backend fournit l'orchestration (création réseaux, supervision topologie, monitoring santé, visualisation graphe) tandis que le mesh fonctionne de manière autonome sur les ESP32-C6.

**Status**: ✅ **OPÉRATIONNEL** - Node.js + Express + Sequelize + JWT + Python RTKLIB + Smart Decision Engine + Zigbee Mesh Orchestration