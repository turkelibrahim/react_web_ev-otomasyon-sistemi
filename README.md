# Home Automation Management System

A university project for CENG 475 to manage home automation.

## Prerequisites

- Node.js 20.13.1 or newer compatible with Vite 6, and npm

## Installation

Install dependencies for each application:

```sh
cd server
npm install
cd ../client
npm install
```

## Development

In separate terminals, run:

```sh
cd server
npm run dev
```

```sh
cd client
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` requests to the Express server at http://localhost:5000. The page displays the result of `GET /api/health`.

To build the frontend for production, run `npm run build` in `client`. To run the backend without nodemon, use `npm start` in `server`.

## Contributors

- Bejan
- Melike
- İbrahim
