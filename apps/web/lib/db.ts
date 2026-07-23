// Re-export the shared database client so the web app imports from one place.
// If we ever swap ORMs or add a caching layer, only this file changes.
export { db } from "@koko/database";
