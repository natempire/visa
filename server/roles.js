// Single source of truth for role hierarchy — server-side. Mirrors src/context/AppContext.js's
// ROLES on the client. Admin sits above expert so every existing `roleMin: expert` /
// `['expert','senior']` check keeps working for admins automatically via level comparison,
// without needing to special-case 'admin' at every call site.
const ROLES_NIVEAU = { admin: 4, expert: 3, senior: 2, assistant: 1 };

module.exports = { ROLES_NIVEAU };
