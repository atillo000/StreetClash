# Deploy to Vercel from GitHub

Commit and push `package.json`, `scripts/build.mjs`, `vercel.json`, `.gitignore` and this guide. Keep `package-lock.json`, `index.html`, `src/`, prepared fighter GLBs, environment models/textures and the asset record in GitHub. The generated GLBs must be real binary files, not Git LFS pointer text.

In Vercel, choose Add New → Project, import your GitHub repository and select the directory containing this game's `package.json` as Root Directory. Use Framework Preset **Other**, Install Command **npm ci**, Build Command **npm run build**, and Output Directory **dist**. The included `vercel.json` supplies these commands and output directory. No environment variables are required. Click Deploy and open the resulting URL.

Do not use `npm start` as the Build Command. That starts the local development server; the deployed game is static HTML, JavaScript, textures and GLBs. The browser runs the game. Subsequent pushes to the production branch trigger another deployment when the Git integration is enabled.

The build copies runtime source, prepared fighters, environment/textures and Three.js into `dist`. It rewrites the output HTML import map to `vendor/three/`, leaving the local development HTML unchanged. Original FBXs, animation source packs, project ZIPs and development scripts are excluded from the output. `npm run build` recreates only the project's `dist` directory.

If the game fails to load, inspect the browser Network tab for missing `.js`, `.glb` or texture requests. Vercel paths are case-sensitive: preserve folder and filename capitalization. Verify the prepared GLBs and environment assets were committed. Do not add a catch-all rewrite returning `index.html` for asset requests; missing model files must return 404 rather than HTML.
