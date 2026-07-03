# DeveloperHub Phase 2–4 API Contract
> **Version:** 1.2 — Schema confirmation + enum completeness pass.
> All dates are ISO 8601 UTC. All IDs are UUID v4.

---

## Changelog (v1.0 → v1.1)

| # | Fix | Impact |
|---|---|---|
| 1 | Added `type` field to Issues (`bug\|feature\|task\|enhancement\|research\|documentation`) | Issues table + Lane D schemas |
| 2 | Attachments deferred to Phase 5 (explicitly documented below) | No schema change now |
| 3 | Added `parent_comment_id` to issue and PR comments for nested threads | Both comment tables + Lane D/E schemas |
| 4 | Issues are now repo-scoped (`POST /repositories/{id}/issues`) with optional `task_id` | Issues table, route shape |
| 5 | PRs are now repo-scoped (`POST /repositories/{id}/pull_requests`) with optional `issue_id` | PR table, route shape |
| 6 | Added `page` / `page_size` query params to all list endpoints | All GET list endpoints |
| 7 | `DELETE /organizations/{id}` documented as hard cascade-delete (matches DB `ON DELETE CASCADE`) | Notes on Lane A |
| 8 | Owner-removal guard rule added to `DELETE /organizations/{id}/members/{user_id}` | Lane A rule |
| 9 | Added optional `comment` field to `POST /pull_requests/{pr_id}/reviews` | PR reviews table + Lane E schema |
| — | Confirmed `milestones.status` column exists in model + migration (`open\|closed`) | No change needed |
| — | Added Task `priority` row to enums table (reuses same values as Issue priority) | Contract only |

---

## Pagination — Applied to All List Endpoints

Every `GET` list endpoint accepts the following query params:

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | 1-based page number |
| `page_size` | integer | 20 | Items per page (max 100) |

Response envelope:

```json
{
  "items": [ ...objects... ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

---

## Attachments — Deferred to Phase 5

**Decision:** File attachment endpoints (`POST /issues/{id}/attachments`, `POST /issue_comments/{id}/attachments`) are **deferred to Phase 5**. Lane D and Lane E must **not** build around their presence. The issue/comment response objects do not include an `attachments` array in Phase 2–4.

---

## Lane A: Organizations CRUD + Membership

### POST /organizations
Create a new organization. The authenticated user becomes the owner.

**Request:**
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "description": "Our awesome company"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "description": "Our awesome company",
  "owner_id": "uuid",
  "created_at": "2026-07-03T12:00:00Z"
}
```

---

### GET /organizations?page=1&page_size=20
List organizations for the current user (owned + member of).

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "description": "...",
      "owner_id": "uuid",
      "created_at": "2026-07-03T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

### GET /organizations/{organization_id}
Get organization details + member list.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "description": "...",
  "owner_id": "uuid",
  "members": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "alice",
        "email": "alice@example.com",
        "full_name": "Alice"
      },
      "role": "owner",
      "joined_at": "2026-07-03T12:00:00Z"
    }
  ],
  "created_at": "2026-07-03T12:00:00Z"
}
```

---

### PUT /organizations/{organization_id}
Update organization (owner only).

**Request:**
```json
{
  "name": "New Name",
  "description": "Updated description"
}
```
**Response (200):** Updated organization object.

---

### DELETE /organizations/{organization_id}
Delete organization (owner only).

> **Cascade behavior:** This is a hard delete. All repositories, projects, tasks, issues, and pull requests nested under this organization are deleted via `ON DELETE CASCADE` at the database level. There is no soft-delete or confirmation step — the operation is final.

**Response (204):** No content.

---

### POST /organizations/{organization_id}/members
Invite user to organization (owner/admin only).

**Request:**
```json
{
  "username": "bob",
  "role": "developer"
}
```
**Response (201):** Member object (see GET organization members).

---

### DELETE /organizations/{organization_id}/members/{user_id}
Remove member (owner/admin only).

> **Owner-removal guard:** The owner member (`role: "owner"`) cannot be removed via this endpoint. A `403 Forbidden` is returned with `"detail": "Owner cannot be removed; transfer ownership first."` Ownership transfer is deferred to a future endpoint.

**Response (204):** No content.

---

### PUT /organizations/{organization_id}/members/{user_id}
Update member role (owner/admin only).

**Request:**
```json
{
  "role": "maintainer"
}
```
**Response (200):** Updated member object.

---

## Lane B: Repositories CRUD

### POST /organizations/{organization_id}/repositories
Create repository in organization (requires developer+ role in org).

**Request:**
```json
{
  "name": "backend",
  "description": "API backend",
  "is_private": false
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "name": "backend",
  "description": "API backend",
  "is_private": false,
  "readme": null,
  "created_by": "uuid",
  "created_at": "2026-07-03T12:00:00Z"
}
```

---

### GET /organizations/{organization_id}/repositories?page=1&page_size=20
List repositories in organization.

**Response (200):**
```json
{
  "items": [ { "...repository object..." } ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

### GET /repositories/{repository_id}
Get repository details.

**Response (200):** Repository object.

---

### PUT /repositories/{repository_id}
Update repository (requires developer+ role in org).

**Request:**
```json
{
  "description": "Updated description",
  "is_private": true,
  "readme": "# My Repo\n\nWelcome!"
}
```
**Response (200):** Updated repository object.

---

### DELETE /repositories/{repository_id}
Delete repository (requires maintainer+ role in org).

> **Cascade behavior:** Deletes all projects, tasks, issues, and PRs under this repository via `ON DELETE CASCADE`.

**Response (204):** No content.

---

## Lane C: Projects + Kanban Board

### POST /repositories/{repository_id}/projects
Create project (requires developer+ role).

**Request:**
```json
{
  "name": "Q3 Sprint",
  "description": "Q3 deliverables"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "repository_id": "uuid",
  "name": "Q3 Sprint",
  "description": "Q3 deliverables",
  "status": "active",
  "created_by": "uuid",
  "created_at": "2026-07-03T12:00:00Z"
}
```

---

### GET /repositories/{repository_id}/projects?page=1&page_size=20
List projects in repository.

**Response (200):**
```json
{
  "items": [ { "...project object..." } ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

### GET /projects/{project_id}
Get project with all tasks grouped by Kanban column.

**Response (200):**
```json
{
  "id": "uuid",
  "repository_id": "uuid",
  "name": "Q3 Sprint",
  "description": "...",
  "status": "active",
  "created_by": "uuid",
  "tasks_by_status": {
    "backlog": [
      {
        "id": "uuid",
        "title": "Fix login bug",
        "description": "...",
        "priority": "high",
        "assigned_to": "uuid",
        "order": 0,
        "created_by": "uuid",
        "created_at": "2026-07-03T12:00:00Z"
      }
    ],
    "todo": [],
    "in_progress": [],
    "review": [],
    "testing": [],
    "completed": []
  },
  "labels": [
    { "id": "uuid", "name": "bug", "color": "#ff0000" }
  ],
  "milestones": [
    { "id": "uuid", "name": "v1.0", "due_date": "2026-08-30T23:59:59Z", "status": "open" }
  ],
  "created_at": "2026-07-03T12:00:00Z"
}
```

---

### PUT /projects/{project_id}
Update project (creator or org maintainer+).

**Request:**
```json
{
  "name": "Updated name",
  "status": "archived"
}
```
**Response (200):** Updated project object.

---

### DELETE /projects/{project_id}
Delete project (creator or org maintainer+).

**Response (204):** No content.

---

### POST /projects/{project_id}/tasks
Create task in project.

**Request:**
```json
{
  "title": "Implement auth",
  "description": "JWT auth for API",
  "priority": "high",
  "assigned_to": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "title": "Implement auth",
  "description": "JWT auth for API",
  "status": "backlog",
  "priority": "high",
  "assigned_to": "uuid",
  "order": 0,
  "created_by": "uuid",
  "created_at": "2026-07-03T12:00:00Z"
}
```

---

### PATCH /tasks/{task_id}
Update task (drag-drop status change, reorder, reassign).

**Request:**
```json
{
  "status": "in_progress",
  "order": 2,
  "assigned_to": "uuid"
}
```
**Response (200):** Updated task object.

---

### DELETE /tasks/{task_id}
Delete task.

**Response (204):** No content.

---

### POST /projects/{project_id}/labels
Create label.

**Request:**
```json
{
  "name": "bug",
  "color": "#ff0000"
}
```
**Response (201):** Label object.

---

### POST /projects/{project_id}/milestones
Create milestone.

**Request:**
```json
{
  "name": "v1.0",
  "description": "Release 1.0",
  "due_date": "2026-08-30T23:59:59Z"
}
```
**Response (201):** Milestone object.

---

## Lane D: Issue Tracker

> **Architecture decision (v1.1):** Issues are **repository-scoped**, not task-scoped. `task_id` is an optional link to a Kanban task. This matches how GitHub Issues and Jira boards relate — they are linked, not strictly parent-child. A bug can be reported directly against a repo without a Kanban task existing first.

---

### POST /repositories/{repository_id}/issues
Create issue (requires developer+ role).

**Request:**
```json
{
  "title": "Login fails on Firefox",
  "description": "Steps to reproduce...",
  "type": "bug",
  "priority": "high",
  "assigned_to": "uuid",
  "milestone_id": "uuid",
  "task_id": "uuid"
}
```

> `type`: `bug | feature | task | enhancement | research | documentation` — **required**
> `task_id`: optional link to a Kanban task
> `milestone_id`: optional

**Response (201):**
```json
{
  "id": "uuid",
  "repository_id": "uuid",
  "task_id": "uuid",
  "number": 1,
  "title": "Login fails on Firefox",
  "description": "...",
  "status": "open",
  "type": "bug",
  "priority": "high",
  "assigned_to": "uuid",
  "milestone_id": "uuid",
  "created_by": "uuid",
  "created_at": "2026-07-03T12:00:00Z"
}
```

---

### GET /repositories/{repository_id}/issues?page=1&page_size=20
List issues for repository.

**Response (200):**
```json
{
  "items": [ { "...issue object..." } ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

### GET /issues/{issue_id}
Get issue with comments.

**Response (200):**
```json
{
  "id": "uuid",
  "repository_id": "uuid",
  "task_id": "uuid",
  "number": 1,
  "title": "...",
  "description": "...",
  "status": "open",
  "type": "bug",
  "priority": "high",
  "assigned_to": "uuid",
  "milestone_id": "uuid",
  "created_by": "uuid",
  "labels": [
    { "id": "uuid", "name": "bug", "color": "#ff0000" }
  ],
  "comments": [
    {
      "id": "uuid",
      "parent_comment_id": null,
      "author": { "id": "uuid", "username": "alice" },
      "content": "Confirmed on my machine",
      "replies": [
        {
          "id": "uuid",
          "parent_comment_id": "uuid",
          "author": { "id": "uuid", "username": "bob" },
          "content": "Same here, Firefox 115.",
          "replies": [],
          "created_at": "2026-07-03T12:01:00Z"
        }
      ],
      "created_at": "2026-07-03T12:00:00Z"
    }
  ],
  "created_at": "2026-07-03T12:00:00Z",
  "updated_at": "2026-07-03T12:00:00Z"
}
```

---

### PATCH /issues/{issue_id}
Update issue.

**Request:**
```json
{
  "status": "closed",
  "type": "bug",
  "assigned_to": "uuid",
  "priority": "low"
}
```
**Response (200):** Updated issue object.

---

### DELETE /issues/{issue_id}
Delete issue.

**Response (204):** No content.

---

### POST /issues/{issue_id}/labels
Add label to issue.

**Request:**
```json
{
  "label_id": "uuid"
}
```
**Response (200):** Updated issue object.

---

### DELETE /issues/{issue_id}/labels/{label_id}
Remove label from issue.

**Response (200):** Updated issue object.

---

### POST /issues/{issue_id}/comments
Add comment to issue. Set `parent_comment_id` to reply to an existing comment.

**Request:**
```json
{
  "content": "I can reproduce this...",
  "parent_comment_id": null
}
```
> `parent_comment_id`: optional UUID. When set, this comment is a reply to the referenced comment. The referenced comment must belong to the same issue.

**Response (201):**
```json
{
  "id": "uuid",
  "issue_id": "uuid",
  "parent_comment_id": null,
  "author": { "id": "uuid", "username": "bob" },
  "content": "I can reproduce this...",
  "replies": [],
  "created_at": "2026-07-03T12:00:00Z"
}
```

---

### DELETE /issue_comments/{comment_id}
Delete comment (author or issue creator only).

**Response (204):** No content.

---

## Lane E: Pull Requests

> **Architecture decision (v1.1):** PRs are **repository-scoped**, not issue-scoped. `issue_id` is an optional link to a tracked issue. This allows PRs to be opened for work that doesn't have a formal issue (e.g. quick docs fix, dependency bump).

---

### POST /repositories/{repository_id}/pull_requests
Create PR (requires developer+ role).

**Request:**
```json
{
  "title": "Fix login for Firefox",
  "description": "Uses feature detection instead of UA sniffing",
  "source_branch": "fix/firefox-login",
  "target_branch": "main",
  "issue_id": "uuid"
}
```
> `issue_id`: optional link to an existing issue.

**Response (201):**
```json
{
  "id": "uuid",
  "repository_id": "uuid",
  "issue_id": "uuid",
  "number": 1,
  "title": "Fix login for Firefox",
  "description": "...",
  "status": "open",
  "source_branch": "fix/firefox-login",
  "target_branch": "main",
  "author_id": "uuid",
  "created_at": "2026-07-03T12:00:00Z",
  "merged_at": null,
  "merged_by": null
}
```

---

### GET /repositories/{repository_id}/pull_requests?page=1&page_size=20
List PRs for repository.

**Response (200):**
```json
{
  "items": [ { "...PR object..." } ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

---

### GET /pull_requests/{pr_id}
Get PR with comments and reviews.

**Response (200):**
```json
{
  "id": "uuid",
  "repository_id": "uuid",
  "issue_id": "uuid",
  "number": 1,
  "title": "...",
  "description": "...",
  "status": "open",
  "source_branch": "fix/firefox-login",
  "target_branch": "main",
  "author": { "id": "uuid", "username": "alice" },
  "comments": [
    {
      "id": "uuid",
      "parent_comment_id": null,
      "author": { "id": "uuid", "username": "bob" },
      "content": "Looks good!",
      "replies": [],
      "created_at": "2026-07-03T12:00:00Z"
    }
  ],
  "reviews": [
    {
      "id": "uuid",
      "reviewer": { "id": "uuid", "username": "bob" },
      "status": "approved",
      "comment": null,
      "created_at": "2026-07-03T12:00:00Z"
    }
  ],
  "created_at": "2026-07-03T12:00:00Z",
  "merged_at": null,
  "merged_by": null
}
```

---

### POST /pull_requests/{pr_id}/reviews
Submit review. `comment` is optional but recommended when `status` is `changes_requested`.

**Request:**
```json
{
  "status": "changes_requested",
  "comment": "Please extract this into a separate util function."
}
```
> `status`: `pending | approved | changes_requested | commented`
> `comment`: optional free-text message attached to the review.

**Response (201):**
```json
{
  "id": "uuid",
  "reviewer": { "id": "uuid", "username": "bob" },
  "status": "changes_requested",
  "comment": "Please extract this into a separate util function.",
  "created_at": "2026-07-03T12:00:00Z"
}
```

---

### POST /pull_requests/{pr_id}/merge
Merge PR (requires maintainer+ role in org).

**Response (200):**
```json
{
  "status": "merged",
  "merged_at": "2026-07-03T12:00:00Z",
  "merged_by": "uuid"
}
```

---

### POST /pull_requests/{pr_id}/comments
Add comment to PR. Set `parent_comment_id` to reply to an existing comment.

**Request:**
```json
{
  "content": "This approach is cleaner!",
  "parent_comment_id": null
}
```
**Response (201):** PR comment object (same shape as issue comment, with `pull_request_id` instead of `issue_id`).

---

### DELETE /pr_comments/{comment_id}
Delete PR comment (author or PR author only).

**Response (204):** No content.

---

## Naming Conventions & Enums

### Timestamps
Always ISO 8601 UTC (e.g. `2026-07-03T12:00:00Z`).

### Status enums

| Entity | Values |
|---|---|
| Tasks | `backlog`, `todo`, `in_progress`, `review`, `testing`, `completed` |
| Issues | `open`, `closed` |
| PRs | `open`, `merged`, `closed` |
| Projects | `active`, `archived`, `closed` |
| Milestones | `open`, `closed` |

### Other enums

| Field | Values |
|---|---|
| Task/Issue `priority` | `low`, `medium`, `high`, `critical` (shared enum — same values for both entities) |
| Issue `type` | `bug`, `feature`, `task`, `enhancement`, `research`, `documentation` |
| Member `role` | `owner`, `admin`, `maintainer`, `developer`, `guest` |
| PR review `status` | `pending`, `approved`, `changes_requested`, `commented` |
| Milestone `status` | `open`, `closed` |

---

## Auth & Permissions

All endpoints require `Authorization: Bearer <jwt_token>` (use existing `get_current_active_user` dependency).

| Role | Permissions |
|---|---|
| `owner` | Full org/repo control, cannot be removed via member delete |
| `admin` | Can manage members, settings |
| `maintainer` | Can merge PRs, manage issues |
| `developer` | Can create/update tasks/issues/PRs |
| `guest` | Read-only |

> Role inheritance: Users inherit role from org membership. Repo-level permissions inherit from org by default.

---

## Error Responses

All errors return JSON with a `detail` key:

```json
{
  "detail": "User not found"
}
```

| Code | Meaning |
|---|---|
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — missing or invalid token |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found — resource doesn't exist |
| 409 | Conflict — unique constraint (e.g. org slug already taken) |
| 500 | Internal Server Error — unexpected |
