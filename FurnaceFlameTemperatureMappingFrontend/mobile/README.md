# Furnace Flame Temperature Mapping (React Native)

This is an Expo-based React Native Android/iOS app port of the web UI from the main project.

## Setup

1. Install expo CLI if not already:
   ```bash
   npm install -g expo-cli
   ```
2. From repository root:
   ```bash
   cd FurnaceFlameTemperatureMappingFrontend/mobile
   npm install
   ```

## Run

- Start Metro:
  ```bash
  npm start
  ```
- Run on Android device/emulator:
  ```bash
  npm run android
  ```

## Notes

- App uses backend API at `https://furnaceflametemperaturemappingbackend.onrender.com` for:
  - GET /history
  - GET /history/:id
  - POST /upload

- Topic mapping in mobile:
  - History list and date filter
  - Row selection to build charts and stats
  - Upload using DocumentPicker

## Recommended dependency updates

If using newest Expo, adjust versions in `package.json` as needed.
