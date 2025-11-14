"""
ASGI config for chat_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

"""
ASGI config for chat_project.

Handles both HTTP and WebSocket connections.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chat_project.settings')

# Initialize Django ASGI application early to populate apps
django_asgi_app = get_asgi_application()

# Import routing after Django is initialized
from chat.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    # Handle HTTP requests
    "http": django_asgi_app,
    
    # Handle WebSocket requests
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
