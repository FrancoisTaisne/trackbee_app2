# CLAUDE.md - TrackBee Project Documentation Management

## 📍 Project Locations

### TrackBee Ecosystem Components
- **TrackBee App (Current)**: `C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\2.Front\trackbee_app2`
- **TrackBee IoT (ESP32-C6)**: `C:\Users\fanjo\workspace\trackbee_v6`
- **TrackBee Backend (Node.js)**: `C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\3.Back\trackbee_back2\src\route`

---

## 📚 Documentation Files Structure

This project maintains **4 core documentation files** that must be kept synchronized with code changes:

### 1. `trackbee_iot.md` - ESP32-C6 IoT Documentation
**Covers**: ESP32-C6 firmware, BLE protocols, GNSS RTK, hardware configuration
**Update when**:
- Firmware version changes
- BLE service modifications (A001/A100)
- New JSON commands added
- GPIO mapping changes
- GNSS configuration updates
- Hardware specifications changes

### 2. `trackbee_app.md` - React Mobile App Documentation
**Covers**: React architecture, state management, BLE integration, mobile features
**Update when**:
- New features added to React app
- State management changes (Zustand stores)
- BLE communication protocol updates
- UI components modifications
- Capacitor plugin changes
- Performance optimizations

### 3. `trackbee_back.md` - Node.js Backend Documentation
**Covers**: API endpoints, database models, authentication, Python integration
**Update when**:
- New API endpoints added/modified
- Database schema changes
- Authentication logic updates
- File upload modifications
- Python RTKLIB integration changes
- Security enhancements

### 4. `scenario.md` - End-to-End User Scenarios
**Covers**: Complete user workflows, validation scenarios, performance metrics
**Update when**:
- New user workflows implemented
- Integration changes between components
- Performance metrics updates
- New test scenarios added
- Validation procedures modified

---

## 🔄 Documentation Update Protocol

### IMPORTANT: Keep Documentation Synchronized

**Each time you modify code in any component (IoT, App, Backend), you MUST update the corresponding documentation file.**

### Update Triggers

#### For `trackbee_iot.md` updates:
```bash
# When modifying ESP32-C6 code:
cd C:\Users\fanjo\workspace\trackbee_v6
# After code changes, update trackbee_iot.md sections:
# - Architecture, BLE protocols, GPIO mapping, firmware version
```

#### For `trackbee_app.md` updates:
```bash
# When modifying React app code:
cd C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\2.Front\trackbee_app2
# After code changes, update trackbee_app.md sections:
# - Features, state management, UI components, performance
```

#### For `trackbee_back.md` updates:
```bash
# When modifying Node.js backend code:
cd C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\3.Back\trackbee_back2\src\route
# After code changes, update trackbee_back.md sections:
# - API endpoints, models, controllers, processing integration
```

#### For `scenario.md` updates:
```bash
# When integration between components changes:
# Update user scenarios, workflows, validation procedures
```

---

## 🎯 Maintenance Guidelines

### Before Code Changes
1. **Read relevant documentation** to understand current architecture
2. **Plan changes** considering impact on other components
3. **Update documentation** immediately after code modifications

### Documentation Quality Standards
- **Keep sections up to date** with actual code implementation
- **Update version numbers** and status indicators
- **Maintain code examples** that reflect actual usage
- **Update performance metrics** when optimizations are made
- **Sync API endpoints** with actual backend routes

### Version Control
- **Commit documentation updates** together with code changes
- **Use meaningful commit messages** that reference doc updates
- **Review documentation** during pull request reviews

---

## 🛠️ Development Commands

### TrackBee App Development
```bash
cd C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\2.Front\trackbee_app2

# Development
npm run dev                    # Start development server
npm run build                  # Production build
npm run type-check             # TypeScript validation
npm run lint                   # Code linting

# Mobile
npm run cap:sync              # Sync to native platforms
npm run cap:run:android       # Run on Android device
```

### TrackBee Backend Development
```bash
cd C:\Users\fanjo\Documents\1. Dev\2. Projet - Site\12.FTTOPO\2.TrackBee\3.Dev\3.Back\trackbee_back2

# Development
npm start                     # Start backend server
npm run dev                   # Development with auto-reload
npm test                      # Run tests
npm run migrate              # Database migrations
```

### TrackBee IoT Development
```bash
cd C:\Users\fanjo\workspace\trackbee_v6

# ESP-IDF Development
idf.py build                  # Build firmware
idf.py flash -p COM3          # Flash to ESP32-C6
idf.py monitor                # Monitor logs
idf.py menuconfig            # Configuration
```

---

## 📊 Documentation Metrics

### Current Status (Last Updated: 2025-09-29)
- **trackbee_iot.md**: 10.9 KB - ESP32-C6 Firmware v6 documented ✅
- **trackbee_app.md**: 22.0 KB - React App production ready ✅
- **trackbee_back.md**: 31.9 KB - Node.js API operational ✅
- **scenario.md**: 14.7 KB - End-to-end validation complete ✅

### Update Frequency Target
- **Critical changes**: Update immediately
- **Minor changes**: Update within 24h
- **Documentation review**: Weekly verification
- **Complete audit**: Monthly full review

---

## 🎯 Remember

**Documentation is code** - Keep it current, accurate, and useful.

When in doubt about any component, **check the corresponding .md file first** - it should contain the most up-to-date information about architecture, APIs, and usage patterns.

**Good documentation saves hours of debugging and onboarding time.**

---

*This file serves as the master guide for maintaining TrackBee ecosystem documentation.*
*Always update this file if project locations or documentation structure changes.*