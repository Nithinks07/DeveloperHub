import asyncio

from sqlalchemy import text

from app.config.database import engine


async def test_connection():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))

            print("\n✅ Database Connected Successfully!\n")
            print(result.fetchone())

    except Exception as e:
        print("\n❌ Database Connection Failed!\n")
        print(e)

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(test_connection())