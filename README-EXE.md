# Build AIcraft as a Windows `.exe`

This project now includes an Electron desktop wrapper.

## Files added
- `main.js` (desktop app entry point)
- `package.json` (Electron + build configuration)
- `build-exe.ps1` (one-command Windows build script)

## Prerequisite
- Install **Node.js LTS** (includes `npm`): https://nodejs.org/

## Build steps (PowerShell)
```powershell
cd "c:\Users\sebas\Documents\AI stuff\AIcraft"
.\build-exe.ps1
```

## Output
Generated files will be in:
- `dist\AIcraft-1.0.0-win-x64.exe` (portable)
- `dist\AIcraft Setup 1.0.0.exe` (installer, exact name may vary by builder version)

## Optional commands
```powershell
npm start           # Run desktop app locally
npm run dist:win    # Build both installer + portable exe
npm run dist:nsis   # Build installer only
npm run dist:portable  # Build portable exe only
```
