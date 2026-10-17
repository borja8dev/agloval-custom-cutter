# Branches, pull requests and releases

How changes travel from an idea to a published version in this repository. It is written for someone who has not used Git branches before, and it uses the real history of this project as the worked example.

## Vocabulary

| Term | Plain meaning |
|---|---|
| **Commit** | One saved step of the code, with a message that explains what changed and why. |
| **Branch** | A parallel copy of the code where a piece of work lives without touching the main line (`main`). |
| **Pull request (PR)** | A request to merge one branch into another. It carries a title, a description, the list of commits and the discussion, and it is where the work is reviewed. |
| **Draft PR** | A PR that is visible but marked "not ready to merge yet". |
| **Merge** | Combining a branch into another one. We use a *merge commit* so that every commit and its message is kept. |
| **Tag** | A permanent name (`v1.1.0`) pointing at one exact commit. |
| **Release** | A tag published on GitHub with written notes: what changed and what to do to upgrade. |
| **Milestone** | A GitHub group of issues and PRs that belong to the same version. |

## Branches

`main` always holds working, tested code. Work happens on a branch named `type/short-description`, in lowercase:

| Prefix | Use |
|---|---|
| `feat/` | New behaviour |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `test/` | Tests only |
| `refactor/` | Restructuring without behaviour change |
| `chore/` | Tooling and housekeeping |

## Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, then a body that says what changed and why when it is not obvious. They carry no tool or co-author attribution.

```
feat(api): bill boards by the whole boards that must be bought

Boards are bought whole, so the count rounds up and the price follows
it: if the pieces need 3.7 boards, 4 are billed. ...
```

Each commit should compile and pass the tests on its own, and tests and docs travel with the behaviour they describe.

## Pull requests

Every PR is opened as a **draft** and contains:

1. A **summary** and the **reason** for the change.
2. A **table of commits** saying what each one does.
3. **Behaviour changes** a user or API client will notice, if any.
4. **Verification**: what was run and what it showed, including what was *not* verified.
5. **Out of scope** and a **test plan**.

Labels and milestone:

| Label | Meaning |
|---|---|
| `type: feature`, `fix`, `docs`, `test`, `refactor`, `chore` | What kind of change it is |
| `area: backend`, `frontend`, `catalog`, `e2e`, `docs` | Which part of the project it touches |
| `stacked` | It depends on another PR: merge in order |
| `behaviour change` | The API or the screen behaves differently afterwards |
| `tracking` | An issue that groups related work |

The milestone is the version the PR ships in (`v1.1.0`, `v1.2.0`).

## Stacked pull requests

A large change is easier to review as a chain of small PRs, each one built on the previous one:

```
main <- #1 <- #2 <- #3 <- ... <- #10
```

- Only the first PR targets `main`. Each next PR targets the **branch of the previous one**, so its diff shows only its own commits.
- A *tracking issue* lists the whole chain and its decisions, and every PR starts with a header that says "position 3 of 10", its base and its neighbours.
- **Merge in order, with a merge commit.** After a PR is merged, GitHub retargets the next one to `main` when the merged branch is deleted; check the base before merging each one.
- Do not force-push a branch that other PRs are built on.

The real example is the work behind v1.1.0 and v1.2.0, tracked in issue #11: the real Agloval catalog and the new order flow, delivered as ten stacked PRs.

## Versioning

The project follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

| Part | Increase it when | Example |
|---|---|---|
| MAJOR | Something that worked stops working in an incompatible way | A removed endpoint |
| MINOR | New capability, backwards compatible | Families endpoint, new order screen |
| PATCH | Bug fix only | A wrong rounding |

Version history:

| Version | Content |
|---|---|
| v0.1.0 | Setup, domain and database |
| v0.2.0 | Backend API and error handling |
| v0.3.0 | React interface, history and end-to-end tests |
| v1.0.0 | Documentation and deployment configuration |
| v1.1.0 | Real catalog, families and unit filters, order quote API |
| v1.2.0 | New order flow, whole-board billing, end-to-end tests |

## Releasing a version

1. **Merge** the PRs of the milestone, in order, each with a merge commit.
2. **Open a release PR** (`chore(release): vX.Y.Z`) that moves the `[Unreleased]` entries of `CHANGELOG.md` under the new version and date and sets the version in the three `package.json` files. Merge it.
3. **Tag** the merge commit on `main` with an annotated tag: `git tag -a vX.Y.Z -m "..."` and push it. Tags are never moved or deleted once published.
4. **Publish the release** on GitHub from that tag, with notes in this shape:
   - *Highlights*: what the version brings.
   - *Behaviour changes*: what looks different to users or API clients.
   - *Upgrade steps*: for example "apply the database migration" and "import the catalog, with a backup first".
   - *Known limitations*.
   - *Pull requests*: the list of merged PRs.
5. **Close the milestone.**

## Things never to do

- Commit the tariff CSV, import reports or database dumps: they hold real prices and are ignored on purpose (`data/source/`, `data/reports/`, `data/backups/`).
- Rewrite or move a published tag.
- Merge a chained PR out of order.
