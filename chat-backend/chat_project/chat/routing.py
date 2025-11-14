from django.urls import re_path
from . import consumers

"""
WebSocket URL patterns

ws://localhost:8000/ws/chat/5/
This will connect to chat room with ID 5
"""

websocket_urlpatterns = [
    re_path(r'ws/chat/(?P<room_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
]