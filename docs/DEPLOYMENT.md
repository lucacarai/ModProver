# Publishing ModProver

Prepared for the same GitHub Desktop → GitHub Pages process used for IntProver.
Suggested repository: **lucacarai/ModProver**. Intended address, once published:
https://lucacarai.github.io/ModProver/

The deployment workflow is `.github/workflows/deploy.yml`, named **Deploy modal
prover to GitHub Pages**. It tests the app, builds the static website and matching
source download, and publishes `dist/`. No npm installation or separate Prolog
installation is required. Node.js 24 is supplied by the workflow.

## Publish through GitHub Desktop

Use the existing project folder:

`C:\Users\carai\Documents\AI projects W\ModProver`

1. In GitHub Desktop, choose **File → New repository**. Set **Name** to
   `ModProver` and **Local path** to `C:\Users\carai\Documents\AI projects W`.
   The resulting repository path must be the existing ModProver folder, not a
   new `ModProver\ModProver` subfolder. Leave **Initialize this repository with a
   README** unchecked, and choose **None** for Git ignore and License. These files
   are already present. Click **Create repository**.
2. Make sure the branch is **main**. Rename it using **Branch → Rename** if needed.
   Review the files and commit them with the summary **Initial ModProver app**.
   Include `.github/workflows/deploy.yml`, `src/`, `vendor/`, `scripts/`, `tests/`,
   `docs/`, the HTML pages, README, package.json, server.mjs, LICENSE and NOTICE.md.
   The supplied `.gitignore` excludes generated builds, screenshots, local
   deployment packages, workspace instructions and the conversation transcript.
3. Click **Publish repository**. Use the account **lucacarai**, name **ModProver**,
   and uncheck **Keep this code private**. Publish.
4. Open the repository on GitHub and choose **Settings → Pages → Build and
   deployment → Source → GitHub Actions**. Do this before running the workflow
   manually. The first automatic push-triggered run may fail if Pages was not
   enabled yet; rerunning after selecting the source resolves that setup issue.
5. Open **Actions → Deploy modal prover to GitHub Pages → Run workflow**. Leave
   the branch as **main**, then click the green **Run workflow** button. Both the
   build and deploy jobs must succeed.
6. Open https://lucacarai.github.io/ModProver/ with its trailing slash. Check:
   - `box p imp p` in S4: valid, with no proof displayed.
   - `p imp box p` in S4: invalid, with an upward-arrow countermodel.
   - `p imp box p` in S5: invalid, with horizontally aligned reciprocal worlds.
   - `dia p imp diamond p`: valid; both diamond spellings are accepted.
   - Footer links **Source code** and **Attribution and license**.

Direct links after the repository is created:

- Repository: https://github.com/lucacarai/ModProver
- Pages settings: https://github.com/lucacarai/ModProver/settings/pages
- Deployment workflow: https://github.com/lucacarai/ModProver/actions/workflows/deploy.yml

Publishing the Pages project provides its own website address. To link it from
a separate personal website, add a link to that address using the same method
you used for IntProver.

## Future updates

Continue editing this same ModProver folder. In GitHub Desktop, review the
changes, **Commit to main**, then **Push origin**. The workflow tests, rebuilds
and republishes the app automatically, including a matching source archive.

## Local verification

```text
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/preview.mjs
```

The preview at http://127.0.0.1:4176/modprover/ serves the generated website
beneath a subfolder, matching GitHub Pages hosting. All asset paths are relative.
The build is self-contained and requires no running Node.js server in production.

## Optional project archive

`dist/source.zip` contains the complete project source, deployment workflow,
build/test scripts, original GPL engine sources, bundled runtime, notices and a
SHA-256 manifest. It can be extracted as a standalone ModProver project. Using
the existing working folder through GitHub Desktop is simplest for future edits.

Preserve the license, attribution page and source download with every deployed
version. The build deliberately excludes workspace instructions, conversation
history and screenshots from the public source archive.

## Troubleshooting

- **Workflow missing:** confirm `.github/workflows/deploy.yml` was committed and
  pushed to `main`. Use the direct workflow link above while signed in.
- **Configure Pages failed:** choose **GitHub Actions** in Pages settings, then
  rerun the workflow on `main`.
- **Assets or source ZIP return 404:** publish the entire generated `dist/`
  directory, and open the project URL with a trailing slash.
- **An app check is incomplete:** loading failures and timeouts never count as
  mathematical invalidity. Inspect browser errors and the Actions build result.

References: [GitHub Desktop publishing](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop),
[GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site),
[custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
