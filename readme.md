# Nyanya (Pomodoro Timer)

A modern, feature-rich Pomodoro application designed for focus and productivity. Built as a Progressive Web App (PWA), it works offline and can be installed on your mobile devices for a native-like experience.

## Features

### **Timer & Productivity**
- **Customizable Pomodoro Timer**: Seamlessly switch between Focus, Short Break, and Long Break sessions.
- **Overtime Awareness (Additional Time)**: Automatically tracks "Additional Time" after a focus session ends, allowing you to easily add extra focus minutes to your completed session with a single click.
- **Tag Management (Tag Forge)**: Categorize your focus sessions with custom tags, predefined HSL color palettes, and specific session durations. Now with a compact, modernized interface.
- **Dynamic Theming**: The application's UI color dynamically updates to match the color of your active tag, now optimized to prevent redundant style recalculations.
- **Smart Notifications**: Stay on track with browser notifications when sessions start or end.

### **Advanced Statistics & Insights**
- **Dashboard Overview**: Track your today's focus, breaks, and interruptions at a glance.
- **Tag Filtering**: Filter all your statistics by a specific tag to analyze your performance in different categories.
- **Visual Analytics**:
  - **Distribution Ring Chart**: See how your focus time is split between different tags.
  - **Focus vs. Interruptions**: A bar chart analyzing your productivity over Today, Week, Month, or Total timeframes.
  - **Productive Hours Heatmap**: Identify your most productive hours of the day.
  - **Yearly Activity Heatmap**: Track long-term focus consistency with a dynamic opacity-based heatmap.
- **Integrated Timeline**: View a detailed history of your sessions, now with integrated daily heatmaps and total focus duration per day.
- **Dynamic Chart Theming**: Charts and graphs automatically update their focus color to match the selected tag in the statistics dashboard.

### **Data & Privacy**
- **Local First**: All data is stored securely on your device using IndexedDB (via Dexie.js).
- **Import/Export**: Full control over your data. Download your history as a JSON file or upload it to sync across devices.
- **Privacy Oriented**: No cloud accounts required; your data stays with you.

## Tech Stack

- **Frontend**: [TypeScript](https://www.typescriptlang.org/), HTML5, CSS3
- **Bundler**: [Vite](https://vitejs.dev/)
- **Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [Dexie.js](https://dexie.org/)
- **Charts**: [Chart.js](https://www.chartjs.org/)
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) for offline support and mobile installation.

### **Performance & Optimization**
- **Background Efficiency**: The timer uses elapsed-time calculation logic, ensuring it remains accurate even in background or hidden tabs.
- **Visibility-Aware Ticking**: Automatically reduces its tick rate when the tab is hidden, significantly saving CPU and battery life on mobile devices.
- **High-Performance Charts**: Optimized Chart.js lifecycle management; data updates are performed in-place instead of destroying and recreating charts, leading to smoother interactions.
- **Resource Conscious**: Implemented IndexedDB read caching and theme-change guards to minimize resource consumption during long background sessions.

## Installation & Local Development

### **Prerequisites**
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (Recommended) or npm

### **Setup**
1. Clone the repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm run dev
   ```
4. Build for production:
   ```bash
   pnpm run build
   ```

### **Accessing on Mobile**
To test on your phone, ensure both devices are on the same Wi-Fi and use the Network URL provided by Vite:
```bash
pnpm run dev --host
```

## Progressive Web App (PWA)
This app is fully PWA-compliant. To install it:
- **Android/Chrome**: Tap the "Add to Home Screen" prompt or find it in the browser menu.
- **iOS/Safari**: Tap the **Share** icon and select **"Add to Home Screen"**.