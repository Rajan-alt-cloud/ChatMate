import json
import traceback
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from jose import jwt, JWTError

from app.database import get_db
from app.models.message import Message
from app.models.user import User
from app.utils.websocket_manager import manager
from app.utils.security import SECRET_KEY, ALGORITHM


router = APIRouter()


def get_user_from_token(token: str, db: Session) -> Optional[User]:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        identifier = (
            payload.get("sub")
            or payload.get("user_id")
            or payload.get("id")
        )

        if not identifier:
            return None

        if str(identifier).isdigit():
            user = db.query(User).filter(
                User.id == int(identifier)
            ).first()

            if user:
                return user

        return db.query(User).filter(
            or_(
                User.username == str(identifier),
                User.email == str(identifier)
            )
        ).first()

    except (JWTError, ValueError):
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    # 1. Authenticate user
    user = get_user_from_token(token, db)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = user.id

    # 2. Connect user & Broadcast Online status
    await manager.connect(user_id, websocket)

    await manager.broadcast({
        "type": "status",
        "user_id": user_id,
        "status": "online"
    })

    await manager.send_personal_message(
        {
            "type": "online_users",
            "users": manager.get_online_users()
        },
        user_id
    )

    # 3. Pending (Undelivered) messages fetch aur deliver karein
    undelivered_messages = db.query(Message).filter(
        Message.receiver_id == user_id,
        Message.is_delivered == False
    ).order_by(Message.created_at.asc()).all()

    for msg in undelivered_messages:
        await manager.send_personal_message({
            "type": "chat",
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": user_id,
            "content": msg.content,
            "attachment_url": msg.attachment_url,
            "file_type": msg.file_type,
            "file_name": msg.file_name,
            "created_at": str(msg.created_at),
            "is_delivered": True,
            "is_read": msg.is_read
        }, user_id)

        msg.is_delivered = True

        # Sender ko delivery ack bhejo
        await manager.send_personal_message({
            "type": "delivery_ack",
            "message_id": msg.id,
            "receiver_id": user_id
        }, msg.sender_id)

    if undelivered_messages:
        db.commit()

    # 4. Real-time message listen loop
    try:
        while True:
            raw_data = await websocket.receive_text()

            try:
                data = json.loads(raw_data)

                # --------------------------------------------------
                # Read Receipts Event (is_read = True & Ack)
                # --------------------------------------------------
                if data.get("type") == "read":
                    target_sender_id = int(data.get("sender_id"))

                    unread_msgs = db.query(Message).filter(
                        Message.sender_id == target_sender_id,
                        Message.receiver_id == user_id,
                        Message.is_read == False
                    ).all()

                    read_ids = [m.id for m in unread_msgs]
                    for m in unread_msgs:
                        m.is_read = True

                    if read_ids:
                        db.commit()
                        # Sender ko blue ticks event bhejo
                        await manager.send_personal_message({
                            "type": "read_ack",
                            "reader_id": user_id,
                            "message_ids": read_ids
                        }, target_sender_id)

                    continue

                # --------------------------------------------------
                # Typing Indicator Event
                # --------------------------------------------------
                if data.get("type") == "typing":
                    target_receiver_id = int(data.get("receiver_id"))
                    is_typing = data.get("is_typing", False)

                    await manager.send_personal_message({
                        "type": "typing",
                        "sender_id": user_id,
                        "is_typing": is_typing
                    }, target_receiver_id)

                    continue

                # --------------------------------------------------
                # Delete Message Event (Delete for Everyone)
                # --------------------------------------------------
                if data.get("type") == "delete":
                    msg_id = int(data.get("message_id"))

                    msg_to_delete = db.query(Message).filter(
                        Message.id == msg_id,
                        Message.sender_id == user_id
                    ).first()

                    if msg_to_delete:
                        target_receiver_id = msg_to_delete.receiver_id
                        
                        db.delete(msg_to_delete)
                        db.commit()

                        delete_payload = {
                            "type": "message_deleted",
                            "message_id": msg_id
                        }

                        # Sender & Receiver dono ko update karo
                        await manager.send_personal_message(delete_payload, user_id)
                        await manager.send_personal_message(delete_payload, target_receiver_id)

                    continue

                # --------------------------------------------------
                # Regular Chat Message & Media Attachment
                # --------------------------------------------------
                raw_receiver_id = data.get("receiver_id")
                content = data.get("content")
                attachment_url = data.get("attachment_url")
                file_type = data.get("file_type")
                file_name = data.get("file_name")

                if not raw_receiver_id or (not content and not attachment_url):
                    continue

                receiver_id = int(raw_receiver_id)
                receiver_online = manager.is_online(receiver_id)

                # DB me message save karein
                new_msg = Message(
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    content=content,
                    attachment_url=attachment_url,
                    file_type=file_type,
                    file_name=file_name,
                    is_delivered=receiver_online,
                    is_read=False
                )

                db.add(new_msg)
                db.commit()
                db.refresh(new_msg)

                payload = {
                    "type": "chat",
                    "id": new_msg.id,
                    "sender_id": user_id,
                    "receiver_id": receiver_id,
                    "content": content,
                    "attachment_url": attachment_url,
                    "file_type": file_type,
                    "file_name": file_name,
                    "created_at": str(new_msg.created_at),
                    "is_delivered": new_msg.is_delivered,
                    "is_read": new_msg.is_read
                }

                # Receiver ko turant deliver karein
                if receiver_online:
                    await manager.send_personal_message(payload, receiver_id)

                # Sender ko confirmation bhejein
                await manager.send_personal_message(payload, user_id)

            except Exception as msg_err:
                db.rollback()
                print(f"Error processing message from user {user_id}: {msg_err}")
                traceback.print_exc()

    except WebSocketDisconnect:
        print(f"User {user_id} disconnected normally.")
    except Exception as e:
        print(f"Connection closed for user {user_id}: {e}")
    finally:
        # FIX: Sirf isi specific WebSocket connection ko disconnect karein
        manager.disconnect(user_id, websocket)
        if not manager.is_online(user_id):
            await manager.broadcast({
                "type": "status",
                "user_id": user_id,
                "status": "offline"
            })