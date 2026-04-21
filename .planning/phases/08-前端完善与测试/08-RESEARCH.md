## Open Questions (RESOLVED)

1. **What is the exact `pages.json` tabBar configuration format for wd-tabbar vs native tabBar?** [RESOLVED by Plan 04]
   - **Decision:** Use native `tabBar` in pages.json for proper routing (not wd-tabbar component). First tab is "联系人" pointing to `pages/contacts/list` per D-15. Icon generation uses sharp CLI script to convert SVG to 81x81 PNG.

2. **What should the `VITE_API_URL` be for production H5 deployment?** [RESOLVED by Plan 01]
   - **Decision:** Dev uses `/api` via Vite proxy. Production H5 needs `VITE_API_URL` set to backend URL over HTTPS in `.env.production`. Plan 01 sets default to `/api` for dev.

3. **Does the current `request.ts` need modification for H5?** [RESOLVED by Plan 01]
   - **Decision:** `request.ts` BASE_URL changed from full URL to `/api` prefix. Vite proxy forwards headers in dev. Production H5 deployment documents HTTPS requirement. No additional H5-specific modifications needed.
