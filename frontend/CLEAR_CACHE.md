# Clear Expo Cache

Nếu gặp lỗi build hoặc import, thử các bước sau:

## 1. Clear Metro Bundler Cache

```bash
cd frontend
npx expo start --clear
```

## 2. Clear Node Modules (nếu vẫn lỗi)

```bash
cd frontend
rm -rf node_modules
npm install
npx expo start --clear
```

## 3. Clear Watchman (nếu có)

```bash
watchman watch-del-all
```

## 4. Reset Expo Cache

```bash
cd frontend
npx expo start -c
```

## 5. Full Reset (nếu vẫn lỗi)

```bash
cd frontend
rm -rf node_modules
rm -rf .expo
rm -rf .expo-shared
npm install
npx expo start --clear
```





