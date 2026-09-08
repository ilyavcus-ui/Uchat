"""
Скрипт для удаления всех пользователей кроме admin.
Удаляет связанные записи (сообщения, уведомления и т.д.)
"""

import asyncio
import asyncpg
from config import DATABASE_URL


async def cleanup():
    pool = await asyncpg.create_pool(DATABASE_URL)
    try:
        async with pool.acquire() as conn:
            # Находим ID admin
            admin_id = await conn.fetchval("SELECT id FROM users WHERE username = 'admin'")
            if not admin_id:
                print("Admin user not found!")
                return

            print(f"Admin user ID: {admin_id}")

            # Считаем сколько пользователей будет удалено
            count = await conn.fetchval("SELECT COUNT(*) FROM users WHERE id != $1", admin_id)
            print(f"Users to delete: {count}")

            if count == 0:
                print("No users to delete")
                return

            # Удаляем связанные записи (порядок важен из-за foreign keys)
            print("Deleting related records...")

            # Сначала комментарии (ссылаются на work_notifications и events)
            result = await conn.execute("DELETE FROM work_comments")
            print(f"  Work comments: {result}")

            result = await conn.execute("DELETE FROM event_comments")
            print(f"  Event comments: {result}")

            # Логи (ссылаются на work_notifications и events)
            result = await conn.execute("DELETE FROM work_logs")
            print(f"  Work logs: {result}")

            result = await conn.execute("DELETE FROM event_logs")
            print(f"  Event logs: {result}")

            # Уведомления и события
            result = await conn.execute("DELETE FROM work_notifications")
            print(f"  Work notifications: {result}")

            result = await conn.execute("DELETE FROM events")
            print(f"  Events: {result}")

            # Обеды
            result = await conn.execute("DELETE FROM lunches")
            print(f"  Lunches: {result}")

            # Сообщения и прочее
            result = await conn.execute(
                "DELETE FROM messages WHERE sender_id != $1 OR receiver_id != $1", admin_id
            )
            print(f"  Messages: {result}")

            result = await conn.execute("DELETE FROM message_read WHERE user_id != $1", admin_id)
            print(f"  Message read: {result}")

            # Теперь пользователи
            result = await conn.execute("DELETE FROM users WHERE id != $1", admin_id)
            print(f"  Users: {result}")

            # Проверяем результат
            final_count = await conn.fetchval("SELECT COUNT(*) FROM users")
            print(f"\nDone! Users remaining: {final_count}")

    finally:
        await pool.close()


if __name__ == "__main__":
    asyncio.run(cleanup())
