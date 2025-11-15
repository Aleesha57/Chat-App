# chat/middleware.py

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from jwt import decode as jwt_decode
from django.conf import settings
from urllib.parse import parse_qs

User = get_user_model()


@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JWTAuthMiddleware:
    """
    Custom middleware for JWT authentication in WebSockets
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Get token from query string
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if token:
            try:
                # Validate token
                UntypedToken(token)
                
                # Decode token to get user_id
                decoded_data = jwt_decode(
                    token, 
                    settings.SECRET_KEY, 
                    algorithms=["HS256"]
                )
                user_id = decoded_data.get('user_id')
                
                # Get user from database
                scope['user'] = await get_user(user_id)
            except (InvalidToken, TokenError, KeyError) as e:
                print(f"Token validation failed: {e}")
                scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()

        return await self.app(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)