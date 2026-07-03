import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock

from app.services.issue_service import get_issue_threaded

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
    def __init__(self, id, issue_id, parent_id, author):
        self.id = id
        self.issue_id = issue_id
        self.parent_comment_id = parent_id
        self.author = author
        self.content = "Test comment"
        self.created_at = 1 # Just for sorting

class MockIssue:
    def __init__(self, issue_id, comments):
        self.id = issue_id
        self.repository_id = uuid.uuid4()
        self.task_id = None
        self.number = 1
        self.title = "Test Issue"
        self.description = "Test"
        self.status = "open"
        self.type = "bug"
        self.priority = "high"
        self.assigned_to = None
        self.milestone_id = None
        self.created_by = uuid.uuid4()
        self.created_at = "now"
        self.updated_at = "now"
        self.labels = []
        self.comments = comments

async def run_test():
    db = AsyncMock()
    issue_id = uuid.uuid4()
    
    author = MockAuthor()
    c1 = MockComment(uuid.uuid4(), issue_id, None, author)
    c2 = MockComment(uuid.uuid4(), issue_id, c1.id, author)
    c3 = MockComment(uuid.uuid4(), issue_id, c2.id, author)
    
    issue = MockIssue(issue_id, [c1, c2, c3])
    
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = issue
    db.execute.return_value = mock_result
    
    threaded = await get_issue_threaded(db, issue_id)
    comments = threaded["comments"]
    
    assert len(comments) == 1, "Should be 1 root comment"
    assert len(comments[0]['replies']) == 1, "Should be 1 reply to root"
    assert len(comments[0]['replies'][0]['replies']) == 1, "Should be 1 deep reply"
    
    print("Threading logic verified successfully via mock!")

asyncio.run(run_test())
