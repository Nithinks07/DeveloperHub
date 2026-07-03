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
from app.models.project import Project
from app.models.task import Task
from app.repositories.task import TaskRepository
from app.services.project_service import _reorder_task, _compact_column

load_dotenv()
engine = create_async_engine(os.environ['DATABASE_URL'])
async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def run_test():
    async with engine.begin() as conn:
        # Create all tables (will create projects, tasks, etc if they don't exist)
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as db:
        # Create a fake user, org, repo, project
        user = User(id=uuid.uuid4(), email="test@test.com", password_hash="hash", full_name="Test")
        org = Organization(id=uuid.uuid4(), name="Org", created_by=user.id)
        repo = Repository(id=uuid.uuid4(), organization_id=org.id, name="Repo", created_by=user.id)
        project = Project(id=uuid.uuid4(), repository_id=repo.id, name="Proj", created_by=user.id)
        
        db.add_all([user, org, repo, project])
        await db.commit()
        
        task_repo = TaskRepository(db)
        
        # Add 3 tasks in backlog
        t1 = await task_repo.create({"project_id": project.id, "title": "T1", "status": "backlog", "priority": "medium", "order": 0, "created_by": user.id})
        t2 = await task_repo.create({"project_id": project.id, "title": "T2", "status": "backlog", "priority": "medium", "order": 1, "created_by": user.id})
        t3 = await task_repo.create({"project_id": project.id, "title": "T3", "status": "backlog", "priority": "medium", "order": 2, "created_by": user.id})
        
        # Test same-column reorder (T3 to top)
        print(f"Before move: {[t.title for t in await _compact_column(task_repo, project.id, 'backlog')]}")
        await _reorder_task(db, task_repo, t3, "backlog", 0)
        await db.commit()
        
        # Check order
        backlog = await _compact_column(task_repo, project.id, "backlog")
        print(f"After move T3 to 0:")
        for t in backlog:
            print(f"  {t.title} -> order: {t.order}")
        
        # Test cross-column move (T1 to in_progress at 0)
        await _reorder_task(db, task_repo, t1, "in_progress", 0)
        await db.commit()
        
        in_progress = await _compact_column(task_repo, project.id, "in_progress")
        print(f"After move T1 to in_progress:")
        for t in backlog:
            print(f"  Backlog: {t.title} -> order: {t.order}")
        for t in in_progress:
            print(f"  InProgress: {t.title} -> order: {t.order}")

        # Assert no duplicates or gaps
        backlog = await _compact_column(task_repo, project.id, "backlog")
        orders = [t.order for t in backlog]
        assert orders == list(range(len(backlog))), f"Backlog gaps/dups: {orders}"
        
        in_progress = await _compact_column(task_repo, project.id, "in_progress")
        orders = [t.order for t in in_progress]
        assert orders == list(range(len(in_progress))), f"InProgress gaps/dups: {orders}"
        
        print("Reorder logic successfully tested: No gaps or duplicates.")

        # Cleanup
        await db.delete(project)
        await db.delete(repo)
        await db.delete(org)
        await db.delete(user)
        await db.commit()

asyncio.run(run_test())
