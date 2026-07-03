import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv
import os

from app.models.base import Base
from app.models.user import User
from app.models.organization import Organization
from app.models.repository import Repository
from app.models.issue import Issue
from app.models.issue_comment import IssueComment
from app.services.issue_service import get_issue_threaded

load_dotenv()
engine = create_async_engine(os.environ['DATABASE_URL'])
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def run_test():
    async with engine.begin() as conn:
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as db:
        # Create a fake user, org, repo, issue
        user = User(id=uuid.uuid4(), email="testissue@test.com", password_hash="hash", username="tester")
        org = Organization(id=uuid.uuid4(), name="Org", created_by=user.id)
        repo = Repository(id=uuid.uuid4(), organization_id=org.id, name="Repo", created_by=user.id)
        issue = Issue(
            id=uuid.uuid4(), 
            repository_id=repo.id, 
            number=1, 
            title="Test Issue",
            status="open",
            type="bug",
            priority="medium",
            created_by=user.id
        )
        
        db.add_all([user, org, repo, issue])
        await db.commit()
        
        # Add root comment
        c1 = IssueComment(id=uuid.uuid4(), issue_id=issue.id, author_id=user.id, content="Root comment")
        db.add(c1)
        await db.commit()
        
        # Add reply to root
        c2 = IssueComment(id=uuid.uuid4(), issue_id=issue.id, author_id=user.id, content="Reply 1", parent_comment_id=c1.id)
        db.add(c2)
        await db.commit()
        
        # Add deep reply
        c3 = IssueComment(id=uuid.uuid4(), issue_id=issue.id, author_id=user.id, content="Reply 2", parent_comment_id=c2.id)
        db.add(c3)
        await db.commit()
        
        threaded = await get_issue_threaded(db, issue.id)
        
        comments = threaded["comments"]
        print(f"Root comments: {len(comments)}")
        print(f"Root replies: {len(comments[0]['replies'])}")
        print(f"Deep replies: {len(comments[0]['replies'][0]['replies'])}")
        
        assert len(comments) == 1, "Should be 1 root comment"
        assert len(comments[0]['replies']) == 1, "Should be 1 reply to root"
        assert len(comments[0]['replies'][0]['replies']) == 1, "Should be 1 deep reply"
        
        print("Threading logic verified successfully!")

        # Cleanup
        await db.delete(issue)
        await db.delete(repo)
        await db.delete(org)
        await db.delete(user)
        await db.commit()

asyncio.run(run_test())
