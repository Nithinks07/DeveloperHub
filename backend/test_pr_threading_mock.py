import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock

from app.services.pull_request_service import get_pull_request_threaded

class MockAuthor:
    def __init__(self):
        self.id = uuid.uuid4()
        self.username = "testuser"
        self.email = "test@test.com"
        self.is_active = True
        self.is_email_verified = True
        self.full_name = None
        self.bio = None
        self.avatar_url = None
        self.created_at = None
        self.updated_at = None

class MockComment:
    def __init__(self, id, pr_id, parent_id, author):
        self.id = id
        self.pull_request_id = pr_id
        self.parent_comment_id = parent_id
        self.author = author
        self.content = "Test PR comment"
        self.created_at = 1 # Just for sorting

class MockPR:
    def __init__(self, pr_id, comments):
        self.id = pr_id
        self.repository_id = uuid.uuid4()
        self.issue_id = None
        self.number = 1
        self.title = "Test PR"
        self.description = "Test PR Description"
        self.status = "open"
        self.source_branch = "feature-A"
        self.target_branch = "main"
        self.author_id = uuid.uuid4()
        self.author = MockAuthor()
        self.created_at = "now"
        self.merged_at = None
        self.merged_by = None
        self.comments = comments
        self.reviews = []

async def run_test():
    db = AsyncMock()
    pr_id = uuid.uuid4()
    
    author = MockAuthor()
    c1 = MockComment(uuid.uuid4(), pr_id, None, author)
    c2 = MockComment(uuid.uuid4(), pr_id, c1.id, author)
    c3 = MockComment(uuid.uuid4(), pr_id, c2.id, author)
    
    pr = MockPR(pr_id, [c1, c2, c3])
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = pr
    db.execute.return_value = mock_result
    
    threaded = await get_pull_request_threaded(db, pr_id)
    comments = threaded["comments"]
    
    assert len(comments) == 1, "Should be 1 root comment"
    assert len(comments[0]['replies']) == 1, "Should be 1 reply to root"
    assert len(comments[0]['replies'][0]['replies']) == 1, "Should be 1 deep reply"
    
    print("Threading logic for PRs verified successfully via mock!")

asyncio.run(run_test())
