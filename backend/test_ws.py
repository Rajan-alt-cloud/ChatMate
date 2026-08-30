import json
import threading
import sys
import websocket

token = input("Enter YOUR JWT Access Token: ").strip()
receiver_id = int(input("Enter RECEIVER User ID (e.g. 4 or 7): ").strip())

ws_url = f"ws://127.0.0.1:8000/ws?token={token}"

def listen_messages(ws):
    while True:
        try:
            response = ws.recv()
            if not response:
                break
            data = json.loads(response)
            msg_type = data.get("type")

            if msg_type == "status":
                status_text = data.get('status').upper()
                print(f"\n📢 [STATUS EVENT] User {data.get('user_id')} is now {status_text}\nYou: ", end="", flush=True)

            elif msg_type == "online_users":
                print(f"\n👥 [ONLINE USERS]: {data.get('users')}\nYou: ", end="", flush=True)

            elif msg_type == "chat":
                sender = data.get('sender_id')
                content = data.get('content')
                is_del = data.get('is_delivered')
                print(f"\n💬 [User {sender}]: {content} | Delivered: {is_del}\nYou: ", end="", flush=True)

            elif msg_type == "delivery_ack":
                msg_id = data.get('message_id')
                rec_id = data.get('receiver_id')
                print(f"\n✅ [DELIVERY ACK] Message #{msg_id} was delivered to User {rec_id}\nYou: ", end="", flush=True)

        except Exception as e:
            print(f"\n⚠️ [Listener stopped]: {e}\nYou: ", end="", flush=True)
            break

try:
    ws = websocket.create_connection(ws_url)
    print("\n--- Connected with JWT Auth & Presence Tracking! (Type message & Enter, or 'exit') ---", flush=True)

    t = threading.Thread(target=listen_messages, args=(ws,), daemon=True)
    t.start()

    while True:
        msg_text = input("You: ")
        if msg_text.strip().lower() == "exit":
            ws.close()
            print("Disconnected.")
            sys.exit(0)
        if not msg_text.strip():
            continue

        payload = {
            "receiver_id": receiver_id,
            "content": msg_text
        }
        ws.send(json.dumps(payload))

except websocket.WebSocketBadStatusException as e:
    print(f"\nConnection Rejected: Status code {e.status_code}")
except Exception as e:
    print(f"\nConnection Error: {e}")