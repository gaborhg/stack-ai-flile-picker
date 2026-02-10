# stackai-file-picker

### Description

This repository contains my solution to the StackAI Frontend Engineer take-home assignment.
The goal of the task is to implement a file picker-like interface for browsing a connected Google Drive and managing indexed resources in a Knowledge Base. The picker allows users to navigate folders, inspect indexing status, and index or de-index files and folders using the provided APIs.

The original task specification can be found here:

https://www.notion.so/Take-at-Home-Task-Frontend-Engineer-75fc2b1904c241ca958d99d69a262803?source=copy_link

### Technology stack

- React
- Next.js
- shadcn/ui
- Tailwind CSS
- TanStack Query
- TanStack Virtual

### Implementation Details

The application behaves similarly to a desktop file manager (e.g. Finder / Windows Explorer), using a breadcrumb-based navigation and folder-scoped listing.

The main responsibility of the UI:
- List folder contents from a Google Drive connection
- Reflect Knowledge Base indexing state
- Allow users to index and de-index resources

#### Backend Integrated Features:

- Folder Content Listing
  - GET `${BACKEND_URL}${API_PREFIX}/connections/{connectionId}/resources/children` - Lists the files and folders of the currently selected path. The endpoint is paginated. The UI fetches 10 items per request and loads additional pages automatically as the user scrolls.
- Knowledge Base State:
  - GET `${BACKEND_URL}/knowledge_bases/{kbId}/resources/children?resource_path={path}` - Fetches resources already indexed in the Knowledge Base under a given path. This data is used to derive and display indexing status for each resource.
- Indexing Resources:
  - PUT `${BACKEND_URL}/knowledge_bases/{kbId}` - Indexes the user-selected files and folders. Selections are handled locally on the client and only persisted when the user explicitly clicks on the "Select files" button.
- De-index (remove resource from Knowledge Base):
  - DELETE `${BACKEND_URL}/knowledge_bases/{kbId}/resources?resource_path={path}` - Removes a resource or folder from the Knowledge Base without deleting it from Google Drive. When the user interacts with an already indexed resource, the UI prompts for confirmation before de-indexing. After removal, the item remains visible in the list with a “De-indexed” status and can be re-selected and re-indexed in a subsequent update.

#### Client-Side Behavior & State Management:

- Folder contents are cached using TanStack Query to avoid unnecessary refetches.
- Already fetched folders are not reloaded unless:
  - the cache expires, or
  - the user explicitly clicks the "Reload directory" button.
- Local UI state (selection, sorting, filtering) is kept client-side and only synced to the server on explicit user action.

This approach keeps server interactions predictable and prevents accidental destructive updates.

#### Frontend-Only Features:

- Search / Filter by resource name (current folder only)
- Sorting
  - by name
  - by modified date
  - ascending / descending order
- Theme toggle
  - light / dark mode
  - initial mode respects system preferences

All of the above operate only on already fetched data and do not trigger additional API requests.

### Screenshots

Light Mode

<img width="1909" height="796" alt="Screenshot 2026-02-10 140716" src="https://github.com/user-attachments/assets/d89b64f6-dec0-4c22-a5c5-1aa47016681c" />

Dark Mode

<img width="1916" height="787" alt="Screenshot 2026-02-10 140743" src="https://github.com/user-attachments/assets/442d6a13-4c7d-4228-9cbb-0b4bb4960397" />

Remove From Knowledge Base Dialog

<img width="1914" height="799" alt="Screenshot 2026-02-10 140759" src="https://github.com/user-attachments/assets/8132a33a-72e5-441d-9c88-ef907ffb947f" />

### How to run the application locally

1. Copy `.env.example` to `.env.local` and fill in the required values.
2. Install dependencies: 
  `yarn install`
3. Run the application:
  `yarn dev`

### Live Demo

You can test the deployed application at:

https://stack-ai-flile-picker.vercel.app/

### Further Notes

- The application was developed based on the information provided in the written specification. Due to limited formal documentation, the implementation relied heavily on exploratory and behavioral testing of the available APIs to understand their behavior, constraints, and non-obvious edge cases.
- GitHub Copilot (GPT-5) was used to scaffold the initial page structure and repetitive boilerplate. All generated code was manually reviewed and adjusted to ensure correctness, readability, and alignment with the intended behavior of the application.
- While there is still room for further refactoring and polish, linting and formatting tools (ESLint and Prettier) were added to the project to enforce consistent code style and to surface potential issues during development.
