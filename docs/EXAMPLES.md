# Examples

Real-world examples of using **lastest** in different scenarios.

## Table of Contents

- [Next.js Projects](#nextjs-projects)
- [React Single Page Apps](#react-single-page-apps)
- [Vue Applications](#vue-applications)
- [CI/CD Integration](#cicd-integration)
- [Advanced Scenarios](#advanced-scenarios)

## Next.js Projects

### App Router

**Project structure:**
```
my-app/
├── app/
│   ├── page.tsx
│   ├── about/
│   │   └── page.tsx
│   └── blog/
│       ├── page.tsx
│       └── [slug]/
│           └── page.tsx
└── .lastestrc.json
```

**Configuration:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://my-app.vercel.app",
  "devUrl": "http://localhost:3000",
  "scanPath": "./app",
  "outputDir": "visual-tests"
}
```

**Commands:**
```bash
# Start dev server
npm run dev

# Run visual tests
npx lastest init
```

**Expected output:**
- Tests for: `/`, `/about`, `/blog`
- Skips dynamic route: `/blog/[slug]`

### Pages Router

**Project structure:**
```
my-app/
├── pages/
│   ├── index.tsx
│   ├── about.tsx
│   └── products/
│       ├── index.tsx
│       └── [id].tsx
└── .lastestrc.json
```

**Configuration:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://my-app.com",
  "devUrl": "http://localhost:3000",
  "scanPath": "./pages"
}
```

## React Single Page Apps

### React Router v6

**Project structure:**
```
my-spa/
├── src/
│   ├── routes/
│   │   └── index.tsx
│   └── pages/
│       ├── Home.tsx
│       ├── About.tsx
│       └── Contact.tsx
└── .lastestrc.json
```

**Routes file (`src/routes/index.tsx`):**
```typescript
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '/contact', element: <Contact /> },
]);
```

**Configuration:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://my-spa.netlify.app",
  "devUrl": "http://localhost:5173",
  "scanPath": "./src"
}
```

### Create React App

**Configuration:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://my-cra-app.com",
  "devUrl": "http://localhost:3000",
  "scanPath": "./src",
  "viewport": {
    "width": 1366,
    "height": 768
  }
}
```

## Vue Applications

### Vue 3 + Vue Router

**Project structure:**
```
my-vue-app/
├── src/
│   ├── router/
│   │   └── index.ts
│   └── views/
│       ├── Home.vue
│       ├── About.vue
│       └── Dashboard.vue
└── .lastestrc.json
```

**Router file (`src/router/index.ts`):**
```typescript
import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../views/Home.vue') },
    { path: '/about', component: () => import('../views/About.vue') },
    { path: '/dashboard', component: () => import('../views/Dashboard.vue') },
  ],
});
```

**Configuration:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://my-vue-app.com",
  "devUrl": "http://localhost:5173",
  "scanPath": "./src"
}
```

## CI/CD Integration

### GitHub Actions - Full Workflow

**.github/workflows/visual-tests.yml:**
```yaml
name: Visual Regression Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Start dev server
        run: npm run dev &
        env:
          NODE_ENV: development

      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 60000

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run visual tests
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npx lastest init \
            --live https://my-app.com \
            --dev http://localhost:3000 \
            --ai claude

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: visual-test-results
          path: lastest-results/
          retention-days: 30

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const summary = fs.readFileSync('lastest-results/summary.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: summary
            });
```

### GitLab CI

**.gitlab-ci.yml:**
```yaml
visual-tests:
  stage: test
  image: node:20
  services:
    - name: playwright
  script:
    - npm ci
    - npm run build
    - npm run dev &
    - npx wait-on http://localhost:3000
    - npx playwright install --with-deps chromium
    - npx lastest init --live $LIVE_URL --dev http://localhost:3000
  artifacts:
    when: always
    paths:
      - lastest-results/
    expire_in: 30 days
  variables:
    ANTHROPIC_API_KEY: $CLAUDE_API_KEY
    LIVE_URL: "https://my-app.com"
```

### CircleCI

**.circleci/config.yml:**
```yaml
version: 2.1

jobs:
  visual-tests:
    docker:
      - image: mcr.microsoft.com/playwright:v1.49.0-focal
    steps:
      - checkout
      - restore_cache:
          keys:
            - deps-{{ checksum "package-lock.json" }}
      - run:
          name: Install dependencies
          command: npm ci
      - save_cache:
          key: deps-{{ checksum "package-lock.json" }}
          paths:
            - node_modules
      - run:
          name: Start dev server
          command: npm run dev
          background: true
      - run:
          name: Wait for server
          command: npx wait-on http://localhost:3000
      - run:
          name: Run visual tests
          command: npx lastest init --live $LIVE_URL --dev http://localhost:3000
          environment:
            ANTHROPIC_API_KEY: $CLAUDE_API_KEY
      - store_artifacts:
          path: lastest-results/
          destination: visual-tests

workflows:
  test:
    jobs:
      - visual-tests
```

## Advanced Scenarios

### Multiple Viewports

Test the same site at different screen sizes:

**desktop-config.json:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "outputDir": "tests-desktop",
  "viewport": {
    "width": 1920,
    "height": 1080
  }
}
```

**mobile-config.json:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "outputDir": "tests-mobile",
  "viewport": {
    "width": 375,
    "height": 812
  }
}
```

**Run both:**
```bash
npx lastest init --config desktop-config.json
npx lastest init --config mobile-config.json
```

### Authenticated Pages

**config-with-auth.json:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://app.example.com",
  "devUrl": "http://localhost:3000",
  "scanPath": "./src/app"
}
```

**Auth script:**
```bash
#!/bin/bash

# Login and get auth token
TOKEN=$(curl -X POST https://api.example.com/login \
  -d '{"email":"test@example.com","password":"test"}' \
  | jq -r '.token')

# Export for tests
export AUTH_TOKEN=$TOKEN

# Run tests
npx lastest init --config config-with-auth.json
```

### Staging vs Production

Compare staging environment to production:

**staging-vs-prod.json:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://example.com",
  "devUrl": "https://staging.example.com",
  "outputDir": "staging-comparison",
  "diffThreshold": 0.05
}
```

```bash
npx lastest init --config staging-vs-prod.json
```

### Selective Page Testing

Test only specific sections:

**marketing-pages.json:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "scanPath": "./src/app/(marketing)",
  "outputDir": "marketing-tests"
}
```

**dashboard-pages.json:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://app.example.com",
  "devUrl": "http://localhost:3000",
  "scanPath": "./src/app/(dashboard)",
  "outputDir": "dashboard-tests"
}
```

### Dynamic Content Handling

For pages with timestamps, dates, or random content:

**high-tolerance.json:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "diffThreshold": 0.3,
  "outputDir": "dynamic-tests"
}
```

### Parallel Execution Tuning

**fast-execution.json:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "parallel": true,
  "maxConcurrency": 15
}
```

**sequential-debug.json:**
```json
{
  "aiProvider": "claude",
  "liveUrl": "https://example.com",
  "devUrl": "http://localhost:3000",
  "parallel": false
}
```

## Tips & Tricks

### 1. Pre-commit Hook

Add to `.husky/pre-commit`:
```bash
#!/bin/bash
npm run dev &
SERVER_PID=$!

npx wait-on http://localhost:3000
npx lastest init --config .lastestrc.json

kill $SERVER_PID
```

### 2. npm Scripts

**package.json:**
```json
{
  "scripts": {
    "test:visual": "lastest init",
    "test:visual:desktop": "lastest init --config desktop.json",
    "test:visual:mobile": "lastest init --config mobile.json",
    "test:visual:all": "npm run test:visual:desktop && npm run test:visual:mobile"
  }
}
```

### 3. Docker Integration

**Dockerfile:**
```dockerfile
FROM mcr.microsoft.com/playwright:v1.49.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npx", "lastest", "init"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  visual-tests:
    build: .
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./lastest-results:/app/lastest-results
```

### 4. Watch Mode (Development)

**watch-and-test.sh:**
```bash
#!/bin/bash

# Watch for changes and re-run tests
while true; do
  inotifywait -r -e modify ./src
  npx lastest init
done
```

## More Examples

Visit the [examples directory](../examples/) in the repository for complete working examples:

- Next.js App Router example
- React SPA example
- Vue 3 example
- CI/CD configurations
