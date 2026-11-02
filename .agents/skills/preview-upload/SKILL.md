---
name: preview-upload
description: Put a rig page preview on its public link, upload it again without the lane marker, or take it down. Use for a plan's "Preview for review" and "Clean up" issues (ADR 0003).
---

# preview-upload

Previews go to GitHub Pages on `BNewman73/rig-preview`, deployed by its workflow
`.github/workflows/preview.yml`. The workflow checks out this repo's `main`, runs rig, saves the
page with `curl` and deploys it as a Pages artifact. The HTML is never committed: a page in git
history keeps its marker (ADR 0003). Link: https://bnewman73.github.io/rig-preview/

Needs `gh`, signed in to the account that owns `rig-preview`. Ask the human before every put and
every re-upload: the link is public.

## Put up, with the marker

The marker comes from the repo secret `LANE_MARKER` (set once from `.env`, never echoed):

```sh
grep '^LANE_MARKER=' .env | cut -d= -f2- | tr -d '\n' | gh secret set LANE_MARKER -R BNewman73/rig-preview
gh workflow run preview.yml -R BNewman73/rig-preview -f marker=true
```

## Upload over it, without the marker

```sh
gh workflow run preview.yml -R BNewman73/rig-preview -f marker=false
```

The banner then reads "no marker set". Pages caches for up to 10 minutes (`max-age=600`).

## After every run

```sh
id=$(gh run list -R BNewman73/rig-preview -w preview.yml -L 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$id" -R BNewman73/rig-preview --exit-status
gh api repos/BNewman73/rig-preview/actions/artifacts --jq '.artifacts[].id' \
  | xargs -I{} gh api -X DELETE repos/BNewman73/rig-preview/actions/artifacts/{}
curl -s https://bnewman73.github.io/rig-preview/ | grep -o '<span class="marker">[^<]*'
```

The artifact holds the page as deployed; delete it so the marked copy isn't downloadable.

## Take down

```sh
gh api -X DELETE repos/BNewman73/rig-preview/pages
```

The page is a fixed night (`/digest/2026-10-28`); change the `curl` path in the workflow for
another page.
