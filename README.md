# Moving Company Manager - Swift Movers

A professional moving company management system built with React, Vite, and Tailwind CSS. This application manages jobs, workers, equipment, and fleet tracking for moving companies.

## 🚀 Features

- **Job Management**: Track and schedule moving jobs.
- **Worker Management**: Manage workforce assignments and payroll.
- **Fleet & Equipment**: Track vehicles and equipment inventory.
- **Scheduling**: Visual scheduling for jobs and resources.

## 🛠️ Tech Stack

- **Frontend**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **State/Data**: [TanStack Query](https://tanstack.com/query) + [Zustand](https://zustand-demo.pmnd.rs/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Runtime**: Node.js or [Bun](https://bun.sh/) (Bun lockfile present)

## 📦 Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <project-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or if using Bun
    bun install
    ```

## 💻 Usage

### Development Server
Start the development server with hot reload:
```bash
npm run dev
# or
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Production Build
Build the application for production:
```bash
npm run build
```
The build artifacts will be stored in the `dist/` directory.

### Preview Production Build
Preview the built application locally:
```bash
npm run serve
```

## ☁️ Deployment

This project is a Single Page Application (SPA) and can be deployed to any static hosting service or serverless environment.

### Google Cloud Run (Serverless)

To deploy to Google Cloud Run, you can containerize the application using Docker and Nginx (or a lightweight Node/Bun server).

See [walkthrough.md](walkthrough.md) for detailed deployment instructions.
