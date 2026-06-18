# Simply Breathe CRM — Staging Repo Workflow

This project uses **two GitHub repos** as a code promotion path. There is **no hosted staging server** — you develop and test locally, then push code through the repos.

| | Production | Staging |
|---|---|---|
| GitHub | [nlmcoaching/SBCRM](https://github.com/nlmcoaching/SBCRM) | [nlmcoaching/SBCRMSTAGING](https://github.com/nlmcoaching/SBCRMSTAGING) |
| Git remote | `origin` | `staging` |
| Branch | `master` | `staging` |

---

## Daily workflow

**1. Work on the `staging` branch**

```bash
git checkout staging
```

**2. Develop and test locally**

```bash
.\start.ps1
# App: http://localhost:5173
```

**3. Commit and push to the staging repo**

```bash
git add .
git commit -m "Your message"
git push staging staging
```

**4. When ready for production — merge into `master` and push**

```bash
git checkout master
git merge staging
git push origin master
git checkout staging    # back to staging for the next round
```

---

## First-time setup (new machine)

```bash
git clone https://github.com/nlmcoaching/SBCRM.git
cd simply-breathe-app   # or your folder name

git remote add staging https://github.com/nlmcoaching/SBCRMSTAGING.git
git fetch staging
git checkout -b staging staging/staging
```

If the staging branch does not exist yet locally:

```bash
git checkout -b staging
git push -u staging staging
```

Keep `master` tracking production:

```bash
git branch --set-upstream-to=origin/master master
```

---

## Quick reference

| Goal | Command |
|---|---|
| Start new work | `git checkout staging` |
| Save work to staging repo | `git push staging staging` |
| Release to production repo | `git checkout master && git merge staging && git push origin master` |
| Pull latest staging code | `git pull staging staging` |
| Pull latest production code | `git pull origin master` |

---

## Rules of thumb

- **Never push `staging` branch to `origin`** — production repo stays on `master` only.
- **Test locally** before merging to `master`.
- **`master` on SBCRMSTAGING** may exist from initial setup but **`staging` is the working branch** on that repo.
