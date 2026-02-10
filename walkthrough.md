# Project Walkthrough: Moving Company Manager

This document provides a walkthrough of the **Moving Company Manager** application structure and deployment process, specifically targeting a serverless environment on **Google Cloud Run**.

## 📂 Project Structure

- **`src/main.tsx`**: Entry point of the React application.
- **`src/routes`**: Contains route definitions using TanStack Router.
    - `index.tsx`: The home page.
    - `__root.tsx`: The root layout.
- **`src/components`**: Reusable UI components (buttons, inputs, etc.) built with Radix UI and Tailwind CSS.
- **`src/features`**: Feature-based modules containing specific views and components.
    - `dashboard/`: Dashboard visualization components.
    - `jobs/`: Job management components.
    - `workers/`: Worker management components.
    - `equipment/`: Equipment inventory components.
    - `vehicles/`: Vehicle fleet components.
    - `payroll/`: Payroll processing components.
    - `scheduling/`: Resource scheduling components.
- **`src/sdk`**: The Custom SDK for interacting with the backend API.
    - `database/orm/client.ts`: Handles data fetching and mutations.
    - `core/`: Core internal utilities.
- **`vite.config.js`**: Configuration for Vite build tool.

## 🚀 Local Development

1.  **Clone & Install**:
    ```bash
    git clone <repo_url>
    cd <repo_en>
    npm install
    ```
2.  **Run Dev Server**:
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:3000`.

## ☁️ Deployment to Google Cloud Run (Serverless)

We will deploy this Single Page Application (SPA) to Google Cloud Run. This is a "serverless" container platform that scales automatically.

### Prerequisites

- [Google Cloud CLI (gcloud)](https://cloud.google.com/sdk/docs/install) installed and authenticated.
- A Google Cloud Project created.

### Step 1: Create a `Dockerfile`

Create a file named `Dockerfile` in the root of your project with the following content. This uses a multi-stage build to keep the final image small.

```dockerfile
# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build the project (output will be in /app/dist)
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed (optional, default is usually fine for simple SPAs, 
# but for client-side routing, you need a config that redirects 404s to index.html)
# Create a nginx.conf file in your project root if you encounter routing issues on refresh.
# simple config:
# server {
#     listen 8080;
#     server_name localhost;
#     location / {
#         root /usr/share/nginx/html;
#         index index.html index.htm;
#         try_files $uri $uri/ /index.html;
#     }
# }

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

> **Note**: For client-side routing (TanStack Router) to work properly on refresh, you should create an `nginx.conf` file ensuring all requests fallback to `index.html`.

### Step 2: Build and Submit the Image

Run the following command in your terminal to build the container image and submit it to Cloud Build (which stores it in Artifact Registry/Container Registry).

```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/moving-company-manager
```
*Replace `PROJECT-ID` with your actual Google Cloud Project ID.*

### Step 3: Deploy to Cloud Run

Deploy the container image to Cloud Run.

```bash
gcloud run deploy moving-company-manager \
  --image gcr.io/PROJECT-ID/moving-company-manager \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

- `--allow-unauthenticated`: Makes the service publicly accessible.
- `--region`: Choose a region close to your users.

### Step 4: Access Your App

Once deployment is complete, the command will output a service URL (e.g., `https://moving-company-manager-xyz-uc.a.run.app`). Open this URL to see your live application.

## 🔄 Alternative: Firebase Hosting

For an even simpler "serverless" static hosting experience (specialized for SPAs), you can use Firebase Hosting:

1.  `npm install -g firebase-tools`
2.  `firebase login`
3.  `firebase init` (Select Hosting, point to `dist` directory, configure as SPA: Yes)
4.  `npm run build`
5.  `firebase deploy`

This is often faster and cheaper than Cloud Run for purely static sites, but Cloud Run offers more flexibility if you need a backend server container later.

## 🧪 Development & Testing

### Running Tests

We have a comprehensive test suite covering all feature modules. To run the tests:

```bash
npm test
```

This will execute unit tests for:
- **DashboardView**: Stats cards and upcoming jobs list.
- **JobsView**: Jobs list and create/edit workflows.
- **WorkersView**: Worker list and status updates.
- **EquipmentView**: Equipment inventory management.
- **VehiclesView**: Vehicle fleet management.
- **PayrollView**: Payroll record display and creation.
- **SchedulingView**: Assignment and resource allocation.


## ✨ Recent Features

### Camera Analysis Fix
- **Issue**: The Quote Generator camera analysis was failing due to missing `model` parameters.
- **Fix**: Updated `use-gpt-vision.ts` to include `model: "gpt-4o"` and `max_tokens: 4096`. Confirmed syntax and parameters are correct for OpenAI `chat/completions` endpoint.

### Distance Calculation
- **Feature**: Added distance calculation to the Quote Generator.
- **Implementation**:
    - Created `useDistanceMatrix` hook using Google Maps Distance Matrix API.
    - Updated `JobsView` to calculate distance between Pickup and Dropoff addresses.
    - Added UI to display Distance and Duration in the Review step.
    - Updated Estimated Cost formula to include distance cost ($2.00/mile).

### Google Vision Migration
- **Feature**: Switched from OpenAI GPT-4o to Google Vision (Gemini 1.5 Flash).
- **Implementation**:
    - Created `use-google-vision.ts` leveraging the existing Google Maps API Key.
    - Replaced `use-gpt-vision.ts` entirely.
    - Maintained exact same feature parity for room inventory analysis.

