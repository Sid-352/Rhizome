# PC_Remote_Server.py (Simplified for Local Network)
#
# INSTRUCTIONS:
# 1. Install libraries: pip install websockets pynput
# 2. Create a 'config.ini' file in the same directory.
# 3. Run the script: python server.py

import asyncio
import ujson as json
import secrets
import socket
import subprocess
import webbrowser
import logging
import configparser
from typing import Dict, Any, Optional, List

import websockets
from websockets.exceptions import ConnectionClosed
from pynput.keyboard import Controller as KeyboardController, Key
from pynput.mouse import Controller as MouseController, Button

# --- Configuration Loading ---
config = configparser.ConfigParser()
config.read('config.ini')

PORT = config.getint('server', 'port', fallback=59874)
SECRET_KEY = config.get('server', 'secret_key', fallback=None)
if not SECRET_KEY:
    SECRET_KEY = secrets.token_hex(16)

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("remote_server.log"),
        logging.StreamHandler()
    ]
)

class CommandExecutor:
    """Handles the execution of all commands received from the client."""
    def __init__(self):
        self.keyboard = KeyboardController()
        self.mouse = MouseController()
        logging.info("CommandExecutor initialized.")

    def _get_special_key(self, key_str: str) -> Optional[Key]:
        return getattr(Key, key_str.lower(), None)

    def key_press(self, data: Dict[str, Any]):
        key_str = data.get('key')
        if not key_str:
            logging.warning("'key_press' command with no key.")
            return
        logging.info(f"Executing KEY PRESS: {key_str}")
        try:
            key_to_press = self._get_special_key(key_str) or key_str
            self.keyboard.press(key_to_press)
            self.keyboard.release(key_to_press)
        except Exception as e:
            logging.error(f"Error pressing key '{key_str}': {e}")

    def key_combo(self, data: Dict[str, Any]):
        keys_str: List[str] = data.get('keys', [])
        if not keys_str:
            logging.warning("'key_combo' command received with no keys specified.")
            return
        logging.info(f"Executing KEY COMBO: {keys_str}")
        try:
            keys = [self._get_special_key(k) or k for k in keys_str]
            for key in keys:
                self.keyboard.press(key)
            for key in reversed(keys):
                self.keyboard.release(key)
        except Exception as e:
            logging.error(f"Error with key combo '{keys_str}': {e}")

    def type_text(self, data: Dict[str, Any]):
        text_to_type = data.get('text')
        if text_to_type is None:
            logging.warning("'text' command received with no text.")
            return
        logging.info("Executing TEXT INPUT.")
        self.keyboard.type(text_to_type)

    async def execute_macro(self, data: Dict[str, Any]):
        """Parses and executes a multi-line macro script."""
        script = data.get('script')
        if not script:
            logging.warning("Macro command received with no script.")
            return

        logging.info("--- Starting Macro Execution ---")
        lines = script.splitlines()

        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue

            parts = line.split(maxsplit=1)
            command = parts[0].upper()
            args = parts[1] if len(parts) > 1 else ""

            try:
                if command == 'TYPE':
                    text_to_type = args.strip('"') # Handle quoted strings
                    logging.info(f"  MACRO: Typing '{text_to_type}'")
                    self.type_text({'text': text_to_type})
                elif command == 'PRESS':
                    logging.info(f"  MACRO: Pressing '{args}'")
                    self.key_press({'key': args})
                elif command == 'COMBO':
                    keys = [k.strip() for k in args.split('+')]
                    logging.info(f"  MACRO: Combo '{keys}'")
                    self.key_combo({'keys': keys})
                elif command == 'WAIT':
                    duration = float(args)
                    logging.info(f"  MACRO: Waiting for {duration}s")
                    await asyncio.sleep(duration)
                else:
                    logging.warning(f"  MACRO: Unknown command '{command}'")

            except Exception as e:
                logging.error(f"  MACRO: Error executing line '{line}': {e}")
                break  # Stop macro on error
        
        logging.info("--- Finished Macro Execution ---")

    def media_control(self, data: Dict[str, Any]):
        action = data.get('action')
        if not action:
            logging.warning("'media_control' received with no action.")
            return
        action_map = {
            'volume_up': 'media_volume_up', 'volume_down': 'media_volume_down',
            'volume_mute': 'media_volume_mute', 'media_play_pause': 'media_play_pause',
            'media_next': 'media_next_track', 'media_previous': 'media_previous_track',
        }
        pynput_action_name = action_map.get(action)
        if not pynput_action_name:
            logging.warning(f"Unknown media action '{action}'")
            return
        logging.info(f"Executing MEDIA CONTROL: {action}")
        media_key = self._get_special_key(pynput_action_name)
        if media_key:
            self.keyboard.press(media_key)
            self.keyboard.release(media_key)
        else:
            logging.error(f"Could not find pynput key for '{pynput_action_name}'")

    def open_website(self, data: Dict[str, Any]):
        url = data.get('url')
        if not url:
            logging.warning("'website' command received with no URL.")
            return
        logging.info(f"Executing OPEN WEBSITE: {url}")
        webbrowser.open(url)

    def shell_command(self, data: Dict[str, Any]):
        command = data.get('command')
        if not command:
            logging.warning("'shell' command received with no command.")
            return
        logging.warning(f"!!! EXECUTING DANGEROUS SHELL COMMAND: {command} !!!")
        try:
            subprocess.run(command, shell=True, check=False)
        except Exception as e:
            logging.error(f"Error executing command '{command}': {e}")

    def mouse_move(self, data: Dict[str, Any]):
        dx = data.get('dx', 0)
        dy = data.get('dy', 0)
        self.mouse.move(dx, dy)

    def mouse_click(self, data: Dict[str, Any]):
        button_str = data.get('button', 'left')
        logging.info(f"Executing MOUSE CLICK: {button_str}")
        button = Button.right if button_str.lower() == 'right' else Button.left
        self.mouse.click(button)

    def mouse_scroll(self, data: Dict[str, Any]):
        dy = data.get('dy', 0)
        if dy != 0:
            self.mouse.scroll(0, dy)


class Server:
    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port
        self.executor = CommandExecutor()
        self.command_handlers = {
            'key_press': self.executor.key_press, 'key_combo': self.executor.key_combo,
            'text': self.executor.type_text, 'media_control': self.executor.media_control,
            'website': self.executor.open_website, 'shell': self.executor.shell_command,
            'mouse_move': self.executor.mouse_move, 'mouse_click': self.executor.mouse_click,
            'mouse_scroll': self.executor.mouse_scroll,
        }

    async def _handle_authentication(self, websocket) -> bool:
        try:
            message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
            data = json.loads(message)
            
            if 'key' in data:
                if data['key'] == SECRET_KEY:
                    logging.info(f"Client authenticated successfully with key.")
                    await websocket.send(json.dumps({"type": "handshake_success"}))
                    return True
                else:
                    logging.warning(f"Authentication failed: Invalid secret key.")
                    await websocket.send(json.dumps({"type": "auth_failed", "reason": "Invalid key"}))
                    return False
            else:
                logging.warning("Authentication failed: No key provided.")
                await websocket.send(json.dumps({"type": "auth_failed", "reason": "No key provided"}))
                return False
        except asyncio.TimeoutError:
            logging.warning("Authentication timed out.")
            return False
        except (json.JSONDecodeError, TypeError):
            logging.warning("Received invalid authentication message.")
            return False

    async def _handle_connection(self, websocket):
        remote_addr = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        logging.info(f"Connection attempt from {remote_addr}")

        is_authenticated = await self._handle_authentication(websocket)
        
        if not is_authenticated:
            await websocket.close()
            logging.info(f"Connection closed with {remote_addr} due to failed auth.")
            return
        
        try:
            async for message in websocket:
                try:
                    command = json.loads(message)
                    command_type = command.get('type')
                    
                    if command_type == 'macro':
                        await self.executor.execute_macro(command.get('data', {}))
                    else:
                        handler_func = self.command_handlers.get(command_type)
                        if handler_func:
                            handler_func(command.get('data', {}))
                        else:
                            logging.warning(f"Received unknown command type '{command_type}'")
                except json.JSONDecodeError:
                    logging.error(f"Received invalid JSON from {remote_addr}")
                except Exception as e:
                    logging.error(f"Error processing command from {remote_addr}: {e}")

        except ConnectionClosed:
            logging.info(f"Client {remote_addr} disconnected gracefully.")
        except Exception as e:
            logging.error(f"An unexpected error occurred with {remote_addr}: {e}")
        finally:
            logging.info(f"Connection with {remote_addr} is closed.")

    def _get_local_ip(self) -> str:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect(('1.1.1.1', 1))
            ip = s.getsockname()[0]
        except Exception:
            ip = '127.0.0.1'
        finally:
            s.close()
        return ip

    async def start(self):
        ip_address = self._get_local_ip()

        header = "\n" + "="*50
        logging.info(header)
        logging.info("--- Modular PC Remote Server ---")
        logging.info(f"  Listening on: ws://{ip_address}:{self.port}")
        logging.info(f"  Secret Key:   {SECRET_KEY}")
        logging.info(header)
        async with websockets.serve(self._handle_connection, self.host, self.port):
            await asyncio.Future()

async def main():
    server = Server(host="0.0.0.0", port=PORT)
    await server.start()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Server is shutting down.")
    except OSError as e:
        logging.critical(f"ERROR: Could not start server. Is port {PORT} already in use? ({e})")
