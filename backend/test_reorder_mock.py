import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock

from app.services.project_service import _reorder_task

class MockTask:
    def __init__(self, id, title, status, order):
        self.id = id
        self.title = title
        self.status = status
        self.order = order
        self.project_id = uuid.uuid4()

async def run_test():
    db = AsyncMock()
    task_repo = AsyncMock()
    
    # Setup initial state
    project_id = uuid.uuid4()
    t1 = MockTask(uuid.uuid4(), "T1", "backlog", 0)
    t2 = MockTask(uuid.uuid4(), "T2", "backlog", 1)
    t3 = MockTask(uuid.uuid4(), "T3", "backlog", 2)
    t1.project_id = project_id
    t2.project_id = project_id
    t3.project_id = project_id
    
    tasks_db = {
        "backlog": [t1, t2, t3],
        "in_progress": []
    }
    
    async def get_tasks_in_column_ordered(proj_id, status, exclude_task_id=None):
        return [t for t in tasks_db[status] if t.id != exclude_task_id]
        
    task_repo.get_tasks_in_column_ordered.side_effect = get_tasks_in_column_ordered
    
    async def bulk_update_order(updates):
        # updates is list of (task_id, new_order)
        # Apply updates to our mock db
        update_dict = dict(updates)
        for col in tasks_db.values():
            for t in col:
                if t.id in update_dict:
                    t.order = update_dict[t.id]
            # sort col to reflect db state
            col.sort(key=lambda x: x.order)

    task_repo.bulk_update_order.side_effect = bulk_update_order

    print("Initial Backlog:", [t.title for t in tasks_db["backlog"]])
    
    # Test same-column move: T3 to top
    print("\n--- Moving T3 to order 0 in backlog ---")
    await _reorder_task(db, task_repo, t3, "backlog", 0)
    print("Backlog after move:")
    for t in tasks_db["backlog"]:
        print(f"  {t.title} -> {t.order}")
        
    # Check no dups/gaps
    orders = [t.order for t in tasks_db["backlog"]]
    assert orders == list(range(len(orders))), f"Gaps/dups: {orders}"
    
    # Test cross-column move: T1 to in_progress at 0
    print("\n--- Moving T1 to order 0 in in_progress ---")
    # Move in memory array for mock
    tasks_db["backlog"].remove(t1)
    tasks_db["in_progress"].append(t1)
    
    await _reorder_task(db, task_repo, t1, "in_progress", 0)
    
    print("Backlog after cross-column move:")
    for t in tasks_db["backlog"]:
        print(f"  {t.title} -> {t.order}")
    print("In Progress after cross-column move:")
    for t in tasks_db["in_progress"]:
        print(f"  {t.title} -> {t.order}")
        
    # Check no dups/gaps
    orders_bl = [t.order for t in tasks_db["backlog"]]
    orders_ip = [t.order for t in tasks_db["in_progress"]]
    assert orders_bl == list(range(len(orders_bl))), f"Gaps/dups: {orders_bl}"
    assert orders_ip == list(range(len(orders_ip))), f"Gaps/dups: {orders_ip}"
    
    print("\nReorder logic successfully tested: No gaps or duplicates.")

asyncio.run(run_test())
