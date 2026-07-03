import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = "postgresql+asyncpg://postgres:Nithin%402005%21@db.ttamynfcpfknzsislsex.supabase.co:5432/postgres"


async def test():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("✅ Connected successfully!")

asyncio.run(test())